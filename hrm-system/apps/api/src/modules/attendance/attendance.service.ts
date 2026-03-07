import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, Repository } from "typeorm";
import { AuthenticatedUser } from "../../common/types/api.types";
import { AttendanceStatus, UserRole } from "../../common/types/enums";
import { ok } from "../../common/utils/response.util";
import { isAdminRole } from "../../common/utils/role.util";
import { Attendance, Employee } from "../../database/entities";
import { CheckInDto, CheckOutDto, UpdateAttendanceDto } from "./dto/attendance.dto";

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance) private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
  ) {}

  private async getCurrentEmployee(user: AuthenticatedUser): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({ where: { userId: user.sub } });
    if (!employee) {
      throw new NotFoundException("Employee profile not found");
    }
    return employee;
  }

  private async resolveScopeEmployeeIds(user: AuthenticatedUser): Promise<string[] | null> {
    if (isAdminRole(user.role)) {
      return null;
    }

    const currentEmployee = await this.getCurrentEmployee(user);
    if (user.role === UserRole.EMPLOYEE) {
      return [currentEmployee.id];
    }

    const team = await this.employeeRepository.find({ where: { reportingManagerId: currentEmployee.id }, select: { id: true } });
    return [currentEmployee.id, ...team.map((item) => item.id)];
  }

  private async resolveTargetEmployeeId(user: AuthenticatedUser, employeeId?: string): Promise<string> {
    if (isAdminRole(user.role) && employeeId) {
      return employeeId;
    }

    const currentEmployee = await this.getCurrentEmployee(user);

    if (!employeeId || employeeId === currentEmployee.id) {
      return currentEmployee.id;
    }

    if (user.role === UserRole.MANAGER) {
      const teamMember = await this.employeeRepository.findOne({
        where: { id: employeeId, reportingManagerId: currentEmployee.id },
      });
      if (!teamMember) {
        throw new ForbiddenException("Managers can check in/out only for their team");
      }
      return teamMember.id;
    }

    throw new ForbiddenException("You can only manage your own attendance");
  }

  async list(user: AuthenticatedUser, query: Record<string, string | undefined>) {
    const employeeIds = await this.resolveScopeEmployeeIds(user);

    const where: any = {};
    if (query.employeeId) {
      if (employeeIds && !employeeIds.includes(query.employeeId)) {
        throw new ForbiddenException("No access to employee attendance");
      }
      where.employeeId = query.employeeId;
    } else if (employeeIds) {
      where.employeeId = In(employeeIds);
    }

    if (query.from && query.to) {
      where.date = Between(query.from, query.to);
    }

    const rows = await this.attendanceRepository.find({
      where,
      relations: { employee: true },
      order: { date: "DESC" },
    });

    const data = rows.map((row) => ({
      ...row,
      employeeCode: row.employee?.biometricCode ?? row.employee?.employeeId ?? null,
    }));

    return ok(data, "Attendance records fetched", { total: data.length });
  }

  async checkIn(user: AuthenticatedUser, dto: CheckInDto) {
    const employeeId = await this.resolveTargetEmployeeId(user, dto.employeeId);
    const date = dto.date ?? new Date().toISOString().slice(0, 10);

    const existing = await this.attendanceRepository.findOne({ where: { employeeId, date } });
    if (existing) {
      throw new ForbiddenException("Attendance already marked for date");
    }

    const entry = this.attendanceRepository.create({
      employeeId,
      date,
      checkIn: new Date(),
      checkOut: null,
      status: AttendanceStatus.PRESENT,
      overtimeMinutes: 0,
      notes: dto.notes ?? null,
    });

    await this.attendanceRepository.save(entry);
    return ok(entry, "Check-in recorded");
  }

  async checkOut(user: AuthenticatedUser, dto: CheckOutDto) {
    const employeeId = await this.resolveTargetEmployeeId(user, dto.employeeId);
    const date = dto.date ?? new Date().toISOString().slice(0, 10);

    const entry = await this.attendanceRepository.findOne({ where: { employeeId, date } });
    if (!entry) {
      throw new NotFoundException("No check-in found for today");
    }

    entry.checkOut = new Date();
    if (entry.checkIn && entry.checkOut) {
      const diffMs = entry.checkOut.getTime() - entry.checkIn.getTime();
      const minutes = Math.max(0, Math.floor(diffMs / 60000));
      entry.overtimeMinutes = Math.max(0, minutes - 480);
      if (minutes < 240) {
        entry.status = AttendanceStatus.HALF_DAY;
      }
    }

    entry.notes = dto.notes ?? entry.notes;
    await this.attendanceRepository.save(entry);

    return ok(entry, "Check-out recorded");
  }

  async update(id: string, dto: UpdateAttendanceDto, user: AuthenticatedUser) {
    if (!isAdminRole(user.role)) {
      throw new ForbiddenException("Only HR and Super Admin can update attendance record");
    }

    const record = await this.attendanceRepository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException("Attendance record not found");
    }

    Object.assign(record, dto);
    await this.attendanceRepository.save(record);
    return ok(record, "Attendance record updated");
  }

  async remove(id: string, user: AuthenticatedUser) {
    if (!isAdminRole(user.role)) {
      throw new ForbiddenException("Only HR and Super Admin can delete attendance record");
    }

    const record = await this.attendanceRepository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException("Attendance record not found");
    }

    await this.attendanceRepository.remove(record);
    return ok({ deleted: true }, "Attendance record deleted");
  }

  async report(user: AuthenticatedUser, query: Record<string, string | undefined>) {
    const employeeIds = await this.resolveScopeEmployeeIds(user);

    const qb = this.attendanceRepository
      .createQueryBuilder("attendance")
      .select("attendance.status", "status")
      .addSelect("COUNT(*)::int", "count");

    if (employeeIds) {
      qb.andWhere("attendance.employeeId IN (:...employeeIds)", { employeeIds });
    }

    if (query.from && query.to) {
      qb.andWhere("attendance.date BETWEEN :from AND :to", { from: query.from, to: query.to });
    }

    qb.groupBy("attendance.status");

    const result = await qb.getRawMany<{ status: string; count: number }>();
    return ok(result, "Attendance summary report generated");
  }
}
