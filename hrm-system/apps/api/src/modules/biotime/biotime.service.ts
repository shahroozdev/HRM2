import { BadGatewayException, ForbiddenException, GatewayTimeoutException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Interval } from "@nestjs/schedule";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import * as bcrypt from "bcrypt";
import { Observable, Subject } from "rxjs";
import { DataSource, ILike, Repository } from "typeorm";
import { AuthenticatedUser, JwtPayload } from "../../common/types/api.types";
import { AttendanceStatus, EmployeeStatus, EmploymentType, UserRole } from "../../common/types/enums";
import { decryptJson } from "../../common/utils/crypto.util";
import { ok } from "../../common/utils/response.util";
import { Attendance, CompanySetting, Department, Designation, Employee, User } from "../../database/entities";

type BiotimeIntegrationConfig = {
  baseUrl: string;
  employeesEndpoint: string;
  attendanceEndpoint: string;
  logsEndpoint: string;
  enabled: boolean;
  pollIntervalSeconds: string;
  lookbackMinutes: string;
};

type BiotimeRuntimeState = {
  lastPulledAt: string;
  lastSuccessAt: string;
};

type FetchOptions = {
  timeoutMs?: number;
  retries?: number;
};

type ShiftTemplate = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  relaxationMinutes?: number;
  breaks?: Array<{ label: string; startTime: string; endTime: string; paid?: boolean }>;
};

type ShiftAssignment = {
  id: string;
  employeeId: string;
  shiftId: string;
  startDate: string;
  endDate: string;
  active?: boolean;
};

@Injectable()
export class BiotimeService {
  private readonly logger = new Logger(BiotimeService.name);
  private readonly events = new Subject<Record<string, unknown>>();
  private isPolling = false;
  private lastPollAt = 0;

  constructor(
    @InjectRepository(CompanySetting) private readonly companySettingRepository: Repository<CompanySetting>,
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Attendance) private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Department) private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Designation) private readonly designationRepository: Repository<Designation>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  private getEncryptionSecret(): string {
    return this.configService.get<string>("SETTINGS_ENCRYPTION_KEY") ?? this.configService.get<string>("JWT_SECRET", "fallback-secret");
  }

  private normalizeBaseUrl(url: string): string {
    return url.trim().replace(/\/+$/, "");
  }

  private normalizePath(path: string): string {
    const normalized = path.trim();
    if (!normalized) {
      return "/";
    }
    return normalized.startsWith("/") ? normalized : `/${normalized}`;
  }

  private async getBiotimeConfig(): Promise<BiotimeIntegrationConfig> {
    const setting = await this.companySettingRepository.findOne({ where: { key: "biotime_integration_secure" } });
    if (!setting) {
      throw new NotFoundException("BioTime integration is not configured");
    }

    const raw = setting.value as Record<string, unknown>;
    if (!raw?.encrypted || !raw?.payload) {
      throw new NotFoundException("BioTime integration is not configured securely");
    }

    const decrypted = decryptJson<BiotimeIntegrationConfig>(raw.payload as any, this.getEncryptionSecret());
    if (!decrypted.baseUrl) {
      throw new NotFoundException("BioTime base URL is missing");
    }

    return {
      baseUrl: this.normalizeBaseUrl(String(decrypted.baseUrl ?? "")),
      employeesEndpoint: this.normalizePath(String(decrypted.employeesEndpoint ?? "/personnel/api/employees/")),
      attendanceEndpoint: this.normalizePath(String(decrypted.attendanceEndpoint ?? "/iclock/api/transactions/")),
      logsEndpoint: this.normalizePath(String(decrypted.logsEndpoint ?? decrypted.attendanceEndpoint ?? "/iclock/api/transactions/")),
      enabled: Boolean(decrypted.enabled),
      pollIntervalSeconds: String(decrypted.pollIntervalSeconds ?? "15"),
      lookbackMinutes: String(decrypted.lookbackMinutes ?? "60"),
    };
  }

  private async getRuntimeState(): Promise<BiotimeRuntimeState> {
    const setting = await this.companySettingRepository.findOne({ where: { key: "biotime_runtime_state" } });
    if (!setting) {
      return { lastPulledAt: "", lastSuccessAt: "" };
    }

    return {
      lastPulledAt: String((setting.value as any)?.lastPulledAt ?? ""),
      lastSuccessAt: String((setting.value as any)?.lastSuccessAt ?? ""),
    };
  }

  private async saveRuntimeState(state: BiotimeRuntimeState): Promise<void> {
    let setting = await this.companySettingRepository.findOne({ where: { key: "biotime_runtime_state" } });
    if (!setting) {
      setting = this.companySettingRepository.create({ key: "biotime_runtime_state", value: state });
    } else {
      setting.value = state;
    }
    await this.companySettingRepository.save(setting);
  }

  private buildUrl(baseUrl: string, endpoint: string, query?: Record<string, string | undefined>): string {
    const url = new URL(`${this.normalizeBaseUrl(baseUrl)}${this.normalizePath(endpoint)}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, value);
        }
      }
    }
    return url.toString();
  }

  private extractRows(payload: unknown): Record<string, unknown>[] {
    if (Array.isArray(payload)) {
      return payload as Record<string, unknown>[];
    }

    if (!payload || typeof payload !== "object") {
      return [];
    }

    const obj = payload as Record<string, unknown>;
    const candidates = ["data", "results", "rows", "items", "list"];
    for (const key of candidates) {
      if (Array.isArray(obj[key])) {
        return obj[key] as Record<string, unknown>[];
      }
    }

    return [];
  }

  private shouldRewriteNextHost(hostname: string): boolean {
    const normalized = hostname.toLowerCase();
    return normalized === "127.0.0.1" || normalized === "localhost" || normalized === "0.0.0.0";
  }

  private resolveNextUrl(currentUrl: string, preferredBaseUrl: string, payload: unknown): string | null {
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const next = (payload as Record<string, unknown>).next;
    if (!next || typeof next !== "string") {
      return null;
    }

    if (next.startsWith("http://") || next.startsWith("https://")) {
      const parsedNext = new URL(next);
      if (this.shouldRewriteNextHost(parsedNext.hostname)) {
        const preferredOrigin = new URL(preferredBaseUrl).origin;
        return `${preferredOrigin}${parsedNext.pathname}${parsedNext.search}`;
      }
      return next;
    }

    const origin = new URL(currentUrl).origin;
    return `${origin}${this.normalizePath(next)}`;
  }

  private async fetchAllPages(url: string, preferredBaseUrl: string, options?: FetchOptions): Promise<Record<string, unknown>[]> {
    const rows: Record<string, unknown>[] = [];
    let nextUrl: string | null = url;
    let loops = 0;
    const timeoutMs = options?.timeoutMs ?? 15000;
    const retries = Math.max(0, options?.retries ?? 0);

    while (nextUrl && loops < 100) {
      let attempt = 0;
      let response: Response | null = null;

      while (attempt <= retries) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
          response = await fetch(nextUrl, {
            method: "GET",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          });
          break;
        } catch (error) {
          const err = error as Error & { code?: string; cause?: { code?: string; message?: string } };
          const causeCode = err.cause?.code || err.code || "NETWORK_ERROR";
          const causeMessage = err.cause?.message || err.message || "Network request failed";

          if (attempt < retries) {
            await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
            attempt += 1;
            continue;
          }

          if (err.name === "AbortError") {
            throw new GatewayTimeoutException({
              message: "BioTime bridge request timed out",
              endpoint: nextUrl,
              timeoutMs,
              retries,
              reason: causeMessage,
            });
          }

          throw new ServiceUnavailableException({
            message: "BioTime bridge is unreachable",
            endpoint: nextUrl,
            reason: causeMessage,
            code: causeCode,
            retries,
          });
        } finally {
          clearTimeout(timeout);
        }
      }

      if (!response) {
        throw new ServiceUnavailableException({
          message: "BioTime bridge is unreachable",
          endpoint: nextUrl,
          reason: "No response received",
        });
      }

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new BadGatewayException({
          message: `BioTime bridge returned HTTP ${response.status}`,
          endpoint: nextUrl,
          status: response.status,
          body: body.slice(0, 500),
        });
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        const body = await response.text().catch(() => "");
        throw new BadGatewayException({
          message: "BioTime bridge returned non-JSON response",
          endpoint: nextUrl,
          status: response.status,
          body: body.slice(0, 500),
        });
      }
      rows.push(...this.extractRows(payload));
      nextUrl = this.resolveNextUrl(nextUrl, preferredBaseUrl, payload);
      loops += 1;
    }

    return rows;
  }

  private splitIntoWindows(fromDate: Date, toDate: Date, windowHours: number): Array<{ from: Date; to: Date }> {
    const windows: Array<{ from: Date; to: Date }> = [];
    const stepMs = Math.max(1, windowHours) * 60 * 60 * 1000;
    let cursor = fromDate.getTime();
    const end = toDate.getTime();

    while (cursor <= end) {
      const next = Math.min(end, cursor + stepMs - 1);
      windows.push({ from: new Date(cursor), to: new Date(next) });
      cursor = next + 1;
    }

    return windows;
  }

  private async fetchLogRows(config: BiotimeIntegrationConfig, fromDate: Date, toDate: Date): Promise<Record<string, unknown>[]> {
    const endpoint = config.logsEndpoint || config.attendanceEndpoint;
    const url = this.buildUrl(config.baseUrl, endpoint, {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      start_time: fromDate.toISOString(),
      end_time: toDate.toISOString(),
      page_size: "200",
    });
    return this.fetchAllPages(url, config.baseUrl, { timeoutMs: 30000, retries: 2 });
  }

  private readAny(record: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = record[key];
      const extracted = this.extractTextValue(value);
      if (extracted) {
        return extracted;
      }
    }
    return "";
  }

  private extractTextValue(value: unknown): string {
    if (value === undefined || value === null) {
      return "";
    }

    if (typeof value === "string") {
      return value.trim();
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value).trim();
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const extracted = this.extractTextValue(item);
        if (extracted) {
          return extracted;
        }
      }
      return "";
    }

    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const preferredKeys = [
        "name",
        "title",
        "designation",
        "designation_name",
        "job_title",
        "position",
        "position_name",
        "job",
        "job_name",
        "post",
        "post_name",
        "role",
        "role_name",
        "rank",
        "label",
        "value",
        "text",
        "department_name",
        "department",
        "dept_name",
        "dept",
        "designation_name",
        "designation",
        "job_title",
      ];

      for (const key of preferredKeys) {
        if (key in obj) {
          const extracted = this.extractTextValue(obj[key]);
          if (extracted) {
            return extracted;
          }
        }
      }
    }

    return "";
  }

  private getEmployeeCode(record: Record<string, unknown>): string {
    return this.readAny(record, ["emp_code", "empCode", "employee_code", "employeeCode", "badge", "badge_number", "emp_id", "employeeId"]);
  }

  private toBoolean(value: unknown): boolean | null {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["1", "true", "yes", "y", "active", "enabled", "authorized", "authorised"].includes(normalized)) return true;
      if (["0", "false", "no", "n", "inactive", "disabled", "unauthorized", "unauthorised", "terminated"].includes(normalized)) return false;
    }
    return null;
  }

  private isEligibleEmployee(record: Record<string, unknown>): boolean {
    const blockedStates = ["disabled", "inactive", "terminated", "unauthorized", "unauthorised", "not_authorized", "not_authorised"];
    const status = this.readAny(record, ["status", "employee_status", "state"]).toLowerCase();
    if (blockedStates.includes(status)) {
      return false;
    }

    const checks = [
      record.is_active,
      record.active,
      record.enable,
      record.enabled,
      record.authorized,
      record.authorised,
      record.is_authorized,
      record.is_authorised,
    ];

    for (const item of checks) {
      const parsed = this.toBoolean(item);
      if (parsed === false) {
        return false;
      }
    }

    return true;
  }

  private getTransactionTimestamp(record: Record<string, unknown>): Date | null {
    const value = this.readAny(record, ["punch_time", "timestamp", "datetime", "check_time", "time"]);
    if (!value) {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private normalizePunchState(record: Record<string, unknown>): "check_in" | "check_out" {
    const stateRaw = this.readAny(record, ["punch_state", "punch_type", "state", "status", "type", "event_type"]).toLowerCase();
    const stateNum = Number(stateRaw);

    // Common ZKTeco mapping:
    // 0=check_in, 1=check_out, 2=break_out, 3=break_in, 4=overtime_in, 5=overtime_out
    if (!Number.isNaN(stateNum) && [1, 2, 5].includes(stateNum)) {
      return "check_out";
    }
    if (!Number.isNaN(stateNum) && [0, 3, 4].includes(stateNum)) {
      return "check_in";
    }
    if (stateRaw.includes("out") || stateRaw.includes("checkout") || stateRaw.includes("check_out")) {
      return "check_out";
    }
    return "check_in";
  }

  private getDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private parseClockTimeToMinutes(time: string): number | null {
    const match = /^(\d{1,2}):(\d{2})$/.exec((time ?? "").trim());
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      return null;
    }
    return h * 60 + m;
  }

  private getShiftDurationMinutes(shift: ShiftTemplate): number {
    const start = this.parseClockTimeToMinutes(shift.startTime);
    const end = this.parseClockTimeToMinutes(shift.endTime);
    if (start === null || end === null) {
      return 480;
    }

    const raw = end >= start ? end - start : end + 1440 - start;
    const unpaidBreaks = (shift.breaks ?? []).reduce((sum, b) => {
      if (b.paid) return sum;
      const bs = this.parseClockTimeToMinutes(b.startTime);
      const be = this.parseClockTimeToMinutes(b.endTime);
      if (bs === null || be === null) return sum;
      const minutes = be >= bs ? be - bs : be + 1440 - bs;
      return sum + Math.max(0, minutes);
    }, 0);

    return Math.max(1, raw - unpaidBreaks);
  }

  private async getShiftConfig(): Promise<{ shifts: ShiftTemplate[]; assignments: ShiftAssignment[] }> {
    const setting = await this.companySettingRepository.findOne({ where: { key: "shift_config" } });
    if (!setting) {
      return { shifts: [], assignments: [] };
    }
    const value = (setting.value ?? {}) as Record<string, unknown>;
    return {
      shifts: Array.isArray(value.shifts) ? (value.shifts as ShiftTemplate[]) : [],
      assignments: Array.isArray(value.assignments) ? (value.assignments as ShiftAssignment[]) : [],
    };
  }

  private resolveShiftForEmployeeDate(
    employeeId: string,
    date: string,
    shifts: ShiftTemplate[],
    assignments: ShiftAssignment[],
  ): ShiftTemplate | null {
    const matches = assignments
      .filter((a) => {
        if (!a || a.employeeId !== employeeId) return false;
        if (a.active === false) return false;
        return a.startDate <= date && a.endDate >= date;
      })
      .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
    const match = matches[0];
    if (!match) return null;
    return shifts.find((s) => s.id === match.shiftId) ?? null;
  }

  private async ensureUniqueShadowEmail(base: string): Promise<string> {
    const normalizedBase = base.toLowerCase();
    const exists = await this.userRepository.findOne({ where: { email: normalizedBase } });
    if (!exists) {
      return normalizedBase;
    }

    let index = 1;
    while (index < 10000) {
      const email = normalizedBase.replace("@", `+${index}@`);
      const taken = await this.userRepository.findOne({ where: { email } });
      if (!taken) {
        return email;
      }
      index += 1;
    }

    return `biotime+${randomUUID()}@local.hrm`;
  }

  private async nextEmployeeCode(manager: DataSource["manager"]): Promise<string> {
    const count = await manager.count(Employee);
    return `EMP-${String(count + 1).padStart(4, "0")}`;
  }

  private splitName(input: string): { firstName: string; lastName: string } {
    const cleaned = input.trim().replace(/\s+/g, " ");
    if (!cleaned) {
      return { firstName: "", lastName: "" };
    }
    const parts = cleaned.split(" ");
    const firstName = parts[0] ?? "";
    const lastName = parts.slice(1).join(" ") || "Employee";
    return { firstName, lastName };
  }

  private mapEmploymentType(record: Record<string, unknown>): EmploymentType {
    const value = this.readAny(record, ["employment_type", "contract_type", "emp_type"]).toLowerCase();
    if (value.includes("part")) return EmploymentType.PART_TIME;
    if (value.includes("contract")) return EmploymentType.CONTRACT;
    return EmploymentType.FULL_TIME;
  }

  private async resolveDepartmentId(record: Record<string, unknown>): Promise<string | null> {
    const name = this.readAny(record, ["department_name", "department", "dept_name", "dept"]);
    if (!name) return null;
    const normalized = name.trim();
    const existing = await this.departmentRepository.findOne({ where: { name: ILike(normalized) } });
    if (existing) return existing.id;
    const created = this.departmentRepository.create({ name: normalized, description: null, headId: null });
    const saved = await this.departmentRepository.save(created);
    return saved.id;
  }

  private async resolveDesignationId(record: Record<string, unknown>, departmentId: string | null): Promise<string | null> {
    const title = this.readAny(record, [
      "designation_name",
      "designation",
      "title",
      "job_title",
      "position",
      "position_name",
      "job",
      "job_name",
      "post",
      "post_name",
      "role_name",
      "rank",
    ]);
    if (!title) return null;
    const normalized = title.trim();
    if (!departmentId) {
      const existingAny = await this.designationRepository.findOne({ where: { title: ILike(normalized) } });
      if (existingAny) return existingAny.id;
      const fallbackDept = await this.resolveDepartmentId({ department_name: "General" });
      if (!fallbackDept) return null;
      const createdFallback = this.designationRepository.create({ title: normalized, departmentId: fallbackDept });
      const savedFallback = await this.designationRepository.save(createdFallback);
      return savedFallback.id;
    }

    const existing = await this.designationRepository.findOne({ where: { title: ILike(normalized), departmentId } });
    if (existing) return existing.id;
    const created = this.designationRepository.create({ title: normalized, departmentId });
    const saved = await this.designationRepository.save(created);
    return saved.id;
  }

  private getBridgeEmail(record: Record<string, unknown>): string | null {
    const email = this.readAny(record, ["email", "work_email", "official_email", "mail"]);
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) return null;
    return normalized;
  }

  private async resolveOrCreateUserForEmployee(record: Record<string, unknown>, biometricCode: string): Promise<User> {
    const bridgeEmail = this.getBridgeEmail(record);
    if (bridgeEmail) {
      const existingByEmail = await this.userRepository.findOne({ where: { email: bridgeEmail } });
      if (existingByEmail) {
        if (!existingByEmail.isActive) {
          existingByEmail.isActive = true;
          await this.userRepository.save(existingByEmail);
        }
        return existingByEmail;
      }
    }

    const fallbackEmail = await this.ensureUniqueShadowEmail(`biotime.${biometricCode}@local.hrm`);
    const password = await bcrypt.hash(randomUUID(), 10);
    const user = this.userRepository.create({
      email: bridgeEmail ?? fallbackEmail,
      password,
      role: UserRole.EMPLOYEE,
      isActive: true,
    });
    return this.userRepository.save(user);
  }

  private async resolveEmployeeFromBiometricCode(record: Record<string, unknown>): Promise<Employee | null> {
    const biometricCode = this.getEmployeeCode(record);
    if (!biometricCode) {
      return null;
    }

    const byBio = await this.employeeRepository.findOne({ where: { biometricCode } });
    if (byBio) return byBio;

    const byEmployeeCode = await this.employeeRepository.findOne({ where: { employeeId: biometricCode } });
    if (byEmployeeCode) {
      byEmployeeCode.biometricCode = biometricCode;
      await this.employeeRepository.save(byEmployeeCode);
      return byEmployeeCode;
    }
    return null;
  }

  private async upsertEmployeeFromDirectoryRecord(record: Record<string, unknown>): Promise<{ employee: Employee | null; created: boolean; skipped: boolean }> {
    const biometricCode = this.getEmployeeCode(record);
    if (!biometricCode || !this.isEligibleEmployee(record)) {
      return { employee: null, created: false, skipped: true };
    }

    let employee = await this.resolveEmployeeFromBiometricCode(record);
    const fullName = this.readAny(record, ["name", "full_name", "fullName"]);
    const first = this.readAny(record, ["first_name", "firstName", "given_name"]);
    const last = this.readAny(record, ["last_name", "lastName", "surname", "family_name"]);
    const split = this.splitName(fullName);
    const firstName = first || split.firstName;
    const lastName = last || split.lastName;
    if (!firstName || !lastName) {
      return { employee: null, created: false, skipped: true };
    }

    const joinDateRaw = this.readAny(record, ["hire_date", "join_date", "date_joined"]);
    const joinDate = joinDateRaw && !Number.isNaN(new Date(joinDateRaw).getTime()) ? new Date(joinDateRaw).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const phone = this.readAny(record, ["mobile", "phone", "mobile_phone"]) || null;
    const address = this.readAny(record, ["address", "home_address", "residence"]) || null;
    const cnic = this.readAny(record, ["cnic", "national_id", "id_number"]) || null;
    const workLocation = this.readAny(record, ["work_location", "location", "site", "area"]) || null;
    const departmentId = await this.resolveDepartmentId(record);
    const designationId = await this.resolveDesignationId(record, departmentId);
    const employmentType = this.mapEmploymentType(record);

    if (employee) {
      employee.biometricCode = biometricCode;
      employee.firstName = firstName;
      employee.lastName = lastName;
      employee.phone = phone;
      employee.address = address;
      employee.cnic = cnic;
      employee.departmentId = departmentId;
      employee.designationId = designationId;
      employee.joinDate = joinDate;
      employee.workLocation = workLocation;
      employee.employmentType = employmentType;
      employee.status = EmployeeStatus.ACTIVE;
      const updated = await this.employeeRepository.save(employee);
      const user = await this.userRepository.findOne({ where: { id: updated.userId } });
      if (user && !user.isActive) {
        user.isActive = true;
        await this.userRepository.save(user);
      }
      const bridgeEmail = this.getBridgeEmail(record);
      if (user && bridgeEmail && user.email !== bridgeEmail) {
        const emailTaken = await this.userRepository.findOne({ where: { email: bridgeEmail } });
        if (!emailTaken || emailTaken.id === user.id) {
          user.email = bridgeEmail;
          await this.userRepository.save(user);
        }
      }
      return { employee: updated, created: false, skipped: false };
    }

    const created = await this.dataSource.transaction(async (manager) => {
      const bridgeEmail = this.getBridgeEmail(record);
      let savedUser = bridgeEmail ? await manager.findOne(User, { where: { email: bridgeEmail } }) : null;
      if (!savedUser) {
        const fallbackEmail = await this.ensureUniqueShadowEmail(`biotime.${biometricCode}@local.hrm`);
        const password = await bcrypt.hash(randomUUID(), 10);
        const user = manager.create(User, {
          email: bridgeEmail ?? fallbackEmail,
          password,
          role: UserRole.EMPLOYEE,
          isActive: true,
        });
        savedUser = await manager.save(user);
      } else if (!savedUser.isActive) {
        savedUser.isActive = true;
        savedUser = await manager.save(savedUser);
      }

      const existingEmployeeForUser = await manager.findOne(Employee, { where: { userId: savedUser.id } });
      if (existingEmployeeForUser) {
        existingEmployeeForUser.biometricCode = biometricCode;
        existingEmployeeForUser.firstName = firstName;
        existingEmployeeForUser.lastName = lastName;
        existingEmployeeForUser.phone = phone;
        existingEmployeeForUser.address = address;
        existingEmployeeForUser.cnic = cnic;
        existingEmployeeForUser.departmentId = departmentId;
        existingEmployeeForUser.designationId = designationId;
        existingEmployeeForUser.joinDate = joinDate;
        existingEmployeeForUser.employmentType = employmentType;
        existingEmployeeForUser.workLocation = workLocation;
        existingEmployeeForUser.status = EmployeeStatus.ACTIVE;
        return manager.save(existingEmployeeForUser);
      }

      const employeeCode = await this.nextEmployeeCode(manager);
      const newEmployee = manager.create(Employee, {
        employeeId: employeeCode,
        biometricCode,
        userId: savedUser.id,
        firstName,
        lastName,
        avatar: null,
        phone,
        address,
        cnic,
        emergencyContact: null,
        departmentId,
        designationId,
        reportingManagerId: null,
        joinDate,
        employmentType,
        workLocation,
        status: EmployeeStatus.ACTIVE,
      });
      return manager.save(newEmployee);
    });

    return { employee: created, created: true, skipped: false };
  }

  private async purgeSyntheticBiotimeEmployees(): Promise<number> {
    const synthetic = await this.employeeRepository.find({
      where: [
        { firstName: "Biotime", lastName: "User" },
        { firstName: "Biotime", user: { email: ILike("biotime.%@local.hrm") } as any },
      ] as any,
      relations: { user: true },
    });

    if (!synthetic.length) return 0;

    for (const employee of synthetic) {
      await this.employeeRepository.remove(employee);
      await this.userRepository.delete(employee.userId);
    }

    return synthetic.length;
  }

  private async deactivateEmployeeByBiometricCode(code: string): Promise<void> {
    if (!code) return;
    const employee = await this.employeeRepository.findOne({ where: { biometricCode: code } });
    if (!employee) return;
    employee.status = EmployeeStatus.INACTIVE;
    await this.employeeRepository.save(employee);
    const user = await this.userRepository.findOne({ where: { id: employee.userId } });
    if (user && user.isActive) {
      user.isActive = false;
      await this.userRepository.save(user);
    }
  }

  private async cleanupInvalidDepartmentRows(): Promise<number> {
    const invalid = await this.departmentRepository.find({
      where: [{ name: ILike("[object object]") }, { name: ILike("{%") }],
    });
    if (!invalid.length) return 0;
    for (const department of invalid) {
      await this.departmentRepository.remove(department);
    }
    return invalid.length;
  }

  async getStatus() {
    const config = await this.getBiotimeConfig();
    const runtime = await this.getRuntimeState();

    return ok(
      {
        enabled: config.enabled,
        baseUrl: config.baseUrl,
        employeesEndpoint: config.employeesEndpoint,
        attendanceEndpoint: config.attendanceEndpoint,
        logsEndpoint: config.logsEndpoint,
        pollIntervalSeconds: Number(config.pollIntervalSeconds),
        lookbackMinutes: Number(config.lookbackMinutes),
        lastPulledAt: runtime.lastPulledAt || null,
        lastSuccessAt: runtime.lastSuccessAt || null,
      },
      "BioTime integration status fetched",
    );
  }

  async syncEmployees() {
    const config = await this.getBiotimeConfig();
    const url = this.buildUrl(config.baseUrl, config.employeesEndpoint);
    const rows = await this.fetchAllPages(url, config.baseUrl, { timeoutMs: 20000, retries: 2 });
    const removedSynthetic = await this.purgeSyntheticBiotimeEmployees();
    const removedInvalidDepartments = await this.cleanupInvalidDepartmentRows();

    let linked = 0;
    let created = 0;
    let skipped = 0;
    let skippedIneligible = 0;

    for (const row of rows) {
      if (!this.isEligibleEmployee(row)) {
        await this.deactivateEmployeeByBiometricCode(this.getEmployeeCode(row));
        skippedIneligible += 1;
        continue;
      }

      const result = await this.upsertEmployeeFromDirectoryRecord(row);
      if (result.skipped) {
        skipped += 1;
        continue;
      }
      if (!result.employee) {
        skipped += 1;
        continue;
      }
      if (result.created) {
        created += 1;
      } else {
        linked += 1;
      }
    }

    return ok(
      { total: rows.length, created, linked, skipped, skippedIneligible, removedSynthetic, removedInvalidDepartments },
      "BioTime employees sync completed",
    );
  }

  async syncAttendance(input?: { from?: string; to?: string; resetData?: boolean }) {
    const config = await this.getBiotimeConfig();
    const runtime = await this.getRuntimeState();
    const resetData = Boolean(input?.resetData);

    if (resetData) {
      await this.attendanceRepository.clear();
      await this.saveRuntimeState({ lastPulledAt: "", lastSuccessAt: "" });
    }

    const lookbackMinutes = Math.max(1, Number(config.lookbackMinutes || "60"));
    const fromDate = input?.from
      ? new Date(input.from)
      : runtime.lastPulledAt
        ? new Date(runtime.lastPulledAt)
        : new Date(Date.now() - lookbackMinutes * 60_000);
    const toDate = input?.to ? new Date(input.to) : new Date();

    const windows = this.splitIntoWindows(fromDate, toDate, 24);
    const rows: Record<string, unknown>[] = [];
    for (const window of windows) {
      const chunk = await this.fetchLogRows(config, window.from, window.to);
      rows.push(...chunk);
    }

    type DayAggregate = {
      employee: Employee;
      employeeCode: string;
      date: string;
      firstIn: Date | null;
      lastOut: Date | null;
      lastEvent: Date | null;
      logCount: number;
    };

    const grouped = new Map<string, DayAggregate>();
    let skippedNoEmployee = 0;
    let skippedInvalid = 0;

    for (const row of rows) {
      const timestamp = this.getTransactionTimestamp(row);
      if (!timestamp) {
        skippedInvalid += 1;
        continue;
      }

      const employee = await this.resolveEmployeeFromBiometricCode(row);
      if (!employee) {
        skippedNoEmployee += 1;
        continue;
      }

      const date = this.getDateString(timestamp);
      const state = this.normalizePunchState(row);
      const employeeCode = employee.biometricCode ?? this.getEmployeeCode(row);
      const key = `${employee.id}|${date}`;
      const aggregate = grouped.get(key) ?? {
        employee,
        employeeCode,
        date,
        firstIn: null,
        lastOut: null,
        lastEvent: null,
        logCount: 0,
      };

      if (!aggregate.lastEvent || timestamp > aggregate.lastEvent) {
        aggregate.lastEvent = timestamp;
      }
      if (state === "check_in") {
        if (!aggregate.firstIn || timestamp < aggregate.firstIn) {
          aggregate.firstIn = timestamp;
        }
      } else if (!aggregate.lastOut || timestamp > aggregate.lastOut) {
        aggregate.lastOut = timestamp;
      }
      aggregate.logCount += 1;
      grouped.set(key, aggregate);
    }

    const shiftConfig = await this.getShiftConfig();
    let upserted = 0;
    for (const aggregate of grouped.values()) {
      const existing = await this.attendanceRepository.findOne({
        where: { employeeId: aggregate.employee.id, date: aggregate.date },
      });

      let checkIn = aggregate.firstIn ?? null;
      let checkOut = aggregate.lastOut ?? null;
      if (!checkIn && aggregate.lastEvent) {
        checkIn = aggregate.lastEvent;
      }
      if (!checkOut && aggregate.lastEvent && checkIn && aggregate.lastEvent > checkIn) {
        checkOut = aggregate.lastEvent;
      }

      if (existing?.checkIn && checkIn) {
        checkIn = existing.checkIn < checkIn ? existing.checkIn : checkIn;
      } else if (existing?.checkIn) {
        checkIn = existing.checkIn;
      }
      if (existing?.checkOut && checkOut) {
        checkOut = existing.checkOut > checkOut ? existing.checkOut : checkOut;
      } else if (existing?.checkOut) {
        checkOut = existing.checkOut;
      }

      const shift = this.resolveShiftForEmployeeDate(
        aggregate.employee.id,
        aggregate.date,
        shiftConfig.shifts,
        shiftConfig.assignments,
      );

      let status = AttendanceStatus.PRESENT;
      let overtimeMinutes = 0;
      if (checkIn && checkOut) {
        const workedMinutes = Math.max(0, Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000));
        const shiftMinutes = shift ? this.getShiftDurationMinutes(shift) : 480;
        overtimeMinutes = Math.max(0, workedMinutes - shiftMinutes);

        if (shift) {
          const shiftStart = this.parseClockTimeToMinutes(shift.startTime);
          if (shiftStart !== null) {
            const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
            const grace = Math.max(0, Number(shift.relaxationMinutes ?? 0));
            if (checkInMinutes > shiftStart + grace) {
              status = AttendanceStatus.LATE;
            }
          }
        }

        if (workedMinutes < 240) {
          status = AttendanceStatus.HALF_DAY;
        }
      }

      if (!existing) {
        const created = this.attendanceRepository.create({
          employeeId: aggregate.employee.id,
          date: aggregate.date,
          checkIn,
          checkOut,
          status,
          overtimeMinutes,
          notes: "Synced from biometric logs",
          biotimeTransactionId: null,
          source: "biotime_bridge_logs",
          rawPayload: {
            employeeCode: aggregate.employeeCode,
            logCount: aggregate.logCount,
            shiftId: shift?.id ?? null,
            shiftName: shift?.name ?? null,
            shiftStart: shift?.startTime ?? null,
            shiftEnd: shift?.endTime ?? null,
            relaxationMinutes: shift?.relaxationMinutes ?? 0,
          },
        });
        await this.attendanceRepository.save(created);
      } else {
        existing.checkIn = checkIn;
        existing.checkOut = checkOut;
        existing.status = status;
        existing.overtimeMinutes = overtimeMinutes;
        existing.source = "biotime_bridge_logs";
        existing.biotimeTransactionId = null;
        existing.rawPayload = {
          employeeCode: aggregate.employeeCode,
          logCount: aggregate.logCount,
          shiftId: shift?.id ?? null,
          shiftName: shift?.name ?? null,
          shiftStart: shift?.startTime ?? null,
          shiftEnd: shift?.endTime ?? null,
          relaxationMinutes: shift?.relaxationMinutes ?? 0,
        };
        await this.attendanceRepository.save(existing);
      }

      upserted += 1;
      this.events.next({
        type: "attendance_imported",
        employeeId: aggregate.employee.id,
        biometricCode: aggregate.employeeCode,
        date: aggregate.date,
        checkIn: checkIn?.toISOString() ?? null,
        checkOut: checkOut?.toISOString() ?? null,
      });
    }

    const now = new Date().toISOString();
    await this.saveRuntimeState({ lastPulledAt: toDate.toISOString(), lastSuccessAt: now });

    return ok(
      { totalLogs: rows.length, upserted, skippedNoEmployee, skippedInvalid, resetData, from: fromDate.toISOString(), to: toDate.toISOString() },
      "BioTime attendance sync completed",
    );
  }

  @Interval(5000)
  async pollAttendance(): Promise<void> {
    if (this.isPolling) {
      return;
    }

    try {
      const config = await this.getBiotimeConfig();
      if (!config.enabled) {
        return;
      }

      const intervalSeconds = Math.max(5, Number(config.pollIntervalSeconds || "15"));
      const now = Date.now();
      if (now - this.lastPollAt < intervalSeconds * 1000) {
        return;
      }

      this.isPolling = true;
      this.lastPollAt = now;
      await this.syncAttendance();
    } catch (error) {
      this.logger.error(`BioTime poll failed: ${(error as Error).message}`);
    } finally {
      this.isPolling = false;
    }
  }

  async validateStreamToken(token: string): Promise<AuthenticatedUser> {
    if (!token) {
      throw new ForbiddenException("Missing stream token");
    }

    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.get<string>("JWT_SECRET", "dev-secret"),
    });

    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new ForbiddenException("Invalid stream token");
    }

    return payload;
  }

  getEventStream(): Observable<Record<string, unknown>> {
    return this.events.asObservable();
  }
}
