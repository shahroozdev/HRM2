import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { In, Repository } from "typeorm";
import { AuthenticatedUser } from "../../common/types/api.types";
import { UserRole } from "../../common/types/enums";
import { ok } from "../../common/utils/response.util";
import { CompanySetting, Department, Designation, Employee } from "../../database/entities";
import { CreateDepartmentDto, CreateDesignationDto, CreateShiftAssignmentDto, CreateShiftDto, UpdateAccessPolicyDto, UpdateCompanyDto, UpdateDepartmentDto, UpdateDesignationDto, UpdateShiftAssignmentDto, UpdateShiftDto } from "./dto/settings.dto";

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(CompanySetting) private readonly companyRepository: Repository<CompanySetting>,
    @InjectRepository(Department) private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Designation) private readonly designationRepository: Repository<Designation>,
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
  ) {}

  private ensureAdmin(user: AuthenticatedUser): void {
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.HR_MANAGER) {
      throw new ForbiddenException("Only HR and Super Admin can manage settings");
    }
  }

  private ensureSuperAdmin(user: AuthenticatedUser): void {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only Super Admin can manage access control");
    }
  }

  private defaultAccessPolicy() {
    return {
      sidebar: {
        super_admin: ["dashboard", "employees", "attendance", "leaves", "payroll", "documents", "reports", "settings"],
        hr_manager: ["dashboard", "employees", "attendance", "leaves", "payroll", "documents", "reports"],
        manager: ["dashboard", "employees", "attendance", "leaves", "documents", "reports"],
        employee: ["dashboard", "attendance", "leaves", "documents", "payroll"],
      },
      actions: {
        attendanceManualMark: ["super_admin", "hr_manager", "manager"],
      },
    };
  }

  async getCompany(user: AuthenticatedUser) {
    this.ensureAdmin(user);

    let settings = await this.companyRepository.findOne({ where: { key: "company" } });
    if (!settings) {
      settings = this.companyRepository.create({
        key: "company",
        value: {
          name: "HRM Company",
          email: "info@hrm.com",
          phone: "",
          address: "",
        },
      });
      await this.companyRepository.save(settings);
    }

    return ok(settings.value, "Company settings fetched");
  }

  async updateCompany(user: AuthenticatedUser, dto: UpdateCompanyDto) {
    this.ensureAdmin(user);

    let settings = await this.companyRepository.findOne({ where: { key: "company" } });
    if (!settings) {
      settings = this.companyRepository.create({ key: "company", value: {} });
    }

    settings.value = {
      ...(settings.value ?? {}),
      ...dto,
    };

    await this.companyRepository.save(settings);
    return ok(settings.value, "Company settings updated");
  }

  async getAccessPolicy(_user: AuthenticatedUser) {
    let settings = await this.companyRepository.findOne({ where: { key: "access_policy" } });
    if (!settings) {
      settings = this.companyRepository.create({
        key: "access_policy",
        value: this.defaultAccessPolicy(),
      });
      await this.companyRepository.save(settings);
    }

    return ok(settings.value, "Access policy fetched");
  }

  async updateAccessPolicy(user: AuthenticatedUser, dto: UpdateAccessPolicyDto) {
    this.ensureSuperAdmin(user);

    let settings = await this.companyRepository.findOne({ where: { key: "access_policy" } });
    if (!settings) {
      settings = this.companyRepository.create({ key: "access_policy", value: this.defaultAccessPolicy() });
    }

    settings.value = {
      ...this.defaultAccessPolicy(),
      ...(dto.policy ?? {}),
    };
    await this.companyRepository.save(settings);

    return ok(settings.value, "Access policy updated");
  }

  async getDepartments(user: AuthenticatedUser) {
    this.ensureAdmin(user);

    const rows = await this.departmentRepository.find({ relations: { head: true } });
    return ok(rows, "Departments fetched", { total: rows.length });
  }

  async createDepartment(user: AuthenticatedUser, dto: CreateDepartmentDto) {
    this.ensureAdmin(user);

    if (dto.headId) {
      const head = await this.employeeRepository.findOne({ where: { id: dto.headId } });
      if (!head) {
        throw new NotFoundException("Department head employee not found");
      }
    }

    const department = this.departmentRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      headId: dto.headId ?? null,
    });

    await this.departmentRepository.save(department);
    return ok(department, "Department created");
  }

  async updateDepartment(id: string, user: AuthenticatedUser, dto: UpdateDepartmentDto) {
    this.ensureAdmin(user);

    const department = await this.departmentRepository.findOne({ where: { id } });
    if (!department) {
      throw new NotFoundException("Department not found");
    }

    if (dto.headId) {
      const head = await this.employeeRepository.findOne({ where: { id: dto.headId } });
      if (!head) {
        throw new NotFoundException("Department head employee not found");
      }
    }

    department.name = dto.name ?? department.name;
    department.description = dto.description ?? department.description;
    if (dto.headId !== undefined) {
      department.headId = dto.headId || null;
    }

    await this.departmentRepository.save(department);
    return ok(department, "Department updated");
  }

  async deleteDepartment(id: string, user: AuthenticatedUser) {
    this.ensureAdmin(user);

    const department = await this.departmentRepository.findOne({ where: { id } });
    if (!department) {
      throw new NotFoundException("Department not found");
    }

    await this.departmentRepository.remove(department);
    return ok({ deleted: true }, "Department deleted");
  }

  async getDesignations(user: AuthenticatedUser) {
    this.ensureAdmin(user);

    const rows = await this.designationRepository.find({ relations: { department: true } });
    return ok(rows, "Designations fetched", { total: rows.length });
  }

  async createDesignation(user: AuthenticatedUser, dto: CreateDesignationDto) {
    this.ensureAdmin(user);

    const department = await this.departmentRepository.findOne({ where: { id: dto.departmentId } });
    if (!department) {
      throw new NotFoundException("Department not found");
    }

    const designation = this.designationRepository.create({
      title: dto.title,
      departmentId: dto.departmentId,
    });
    await this.designationRepository.save(designation);

    return ok(designation, "Designation created");
  }

  async updateDesignation(id: string, user: AuthenticatedUser, dto: UpdateDesignationDto) {
    this.ensureAdmin(user);

    const designation = await this.designationRepository.findOne({ where: { id } });
    if (!designation) {
      throw new NotFoundException("Designation not found");
    }

    if (dto.departmentId) {
      const department = await this.departmentRepository.findOne({ where: { id: dto.departmentId } });
      if (!department) {
        throw new NotFoundException("Department not found");
      }
      designation.departmentId = dto.departmentId;
    }

    if (dto.title !== undefined) {
      designation.title = dto.title;
    }

    await this.designationRepository.save(designation);
    return ok(designation, "Designation updated");
  }

  async deleteDesignation(id: string, user: AuthenticatedUser) {
    this.ensureAdmin(user);

    const designation = await this.designationRepository.findOne({ where: { id } });
    if (!designation) {
      throw new NotFoundException("Designation not found");
    }

    await this.designationRepository.remove(designation);
    return ok({ deleted: true }, "Designation deleted");
  }

  private async getShiftConfigSetting() {
    let setting = await this.companyRepository.findOne({ where: { key: "shift_config" } });
    if (!setting) {
      setting = this.companyRepository.create({
        key: "shift_config",
        value: { shifts: [], assignments: [] },
      });
      await this.companyRepository.save(setting);
    }
    return setting;
  }

  async getShifts(user: AuthenticatedUser) {
    this.ensureAdmin(user);
    const setting = await this.getShiftConfigSetting();
    return ok((setting.value as any)?.shifts ?? [], "Shift templates fetched");
  }

  async createShift(user: AuthenticatedUser, dto: CreateShiftDto) {
    this.ensureAdmin(user);
    const setting = await this.getShiftConfigSetting();
    const value = (setting.value as any) ?? { shifts: [], assignments: [] };

    const shift = {
      id: randomUUID(),
      name: dto.name,
      startTime: dto.startTime,
      endTime: dto.endTime,
      weeklyOffDays: dto.weeklyOffDays ?? [],
      breaks: (dto.breaks ?? []).map((item) => ({
        label: item.label,
        startTime: item.startTime,
        endTime: item.endTime,
        paid: item.paid ?? false,
      })),
    };

    setting.value = {
      ...value,
      shifts: [...(value.shifts ?? []), shift],
    };
    await this.companyRepository.save(setting);

    return ok(shift, "Shift template created");
  }

  async updateShift(id: string, user: AuthenticatedUser, dto: UpdateShiftDto) {
    this.ensureAdmin(user);
    const setting = await this.getShiftConfigSetting();
    const value = (setting.value as any) ?? { shifts: [], assignments: [] };
    const shifts = value.shifts ?? [];

    const index = shifts.findIndex((item: any) => item.id === id);
    if (index < 0) {
      throw new NotFoundException("Shift template not found");
    }

    shifts[index] = {
      ...shifts[index],
      ...dto,
      breaks: dto.breaks
        ? dto.breaks.map((item) => ({
            label: item.label,
            startTime: item.startTime,
            endTime: item.endTime,
            paid: item.paid ?? false,
          }))
        : shifts[index].breaks,
    };

    setting.value = { ...value, shifts };
    await this.companyRepository.save(setting);
    return ok(shifts[index], "Shift template updated");
  }

  async deleteShift(id: string, user: AuthenticatedUser) {
    this.ensureAdmin(user);
    const setting = await this.getShiftConfigSetting();
    const value = (setting.value as any) ?? { shifts: [], assignments: [] };
    const shifts = value.shifts ?? [];
    const assignments = value.assignments ?? [];

    const exists = shifts.some((item: any) => item.id === id);
    if (!exists) {
      throw new NotFoundException("Shift template not found");
    }

    setting.value = {
      ...value,
      shifts: shifts.filter((item: any) => item.id !== id),
      assignments: assignments.filter((item: any) => item.shiftId !== id),
    };
    await this.companyRepository.save(setting);
    return ok({ deleted: true }, "Shift template deleted");
  }

  async getShiftAssignments(user: AuthenticatedUser) {
    this.ensureAdmin(user);
    const setting = await this.getShiftConfigSetting();
    const value = (setting.value as any) ?? { shifts: [], assignments: [] };
    const shifts = value.shifts ?? [];
    const assignments = value.assignments ?? [];

    const employeeIds = Array.from(new Set(assignments.map((item: any) => item.employeeId)));
    const employees = employeeIds.length
      ? await this.employeeRepository.find({
          where: { id: In(employeeIds) },
          relations: { user: true },
        })
      : [];

    const employeeMap = new Map<string, Employee>(employees.map((item) => [item.id, item]));
    const shiftMap = new Map<string, any>(shifts.map((item: any) => [item.id, item]));

    const data = assignments.map((item: any) => {
      const employee = employeeMap.get(item.employeeId);
      const shift = shiftMap.get(item.shiftId);
      return {
        ...item,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : "Unknown",
        employeeCode: employee?.employeeId ?? "",
        shiftName: shift?.name ?? "Unknown",
      };
    });

    return ok(data, "Shift assignments fetched");
  }

  async createShiftAssignment(user: AuthenticatedUser, dto: CreateShiftAssignmentDto) {
    this.ensureAdmin(user);
    const setting = await this.getShiftConfigSetting();
    const value = (setting.value as any) ?? { shifts: [], assignments: [] };
    const shifts = value.shifts ?? [];

    const shift = shifts.find((item: any) => item.id === dto.shiftId);
    if (!shift) {
      throw new NotFoundException("Shift template not found");
    }

    const employee = await this.employeeRepository.findOne({ where: { id: dto.employeeId } });
    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    const assignment = {
      id: randomUUID(),
      employeeId: dto.employeeId,
      shiftId: dto.shiftId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      notes: dto.notes ?? null,
      active: dto.active ?? true,
    };

    setting.value = {
      ...value,
      assignments: [...(value.assignments ?? []), assignment],
    };
    await this.companyRepository.save(setting);

    return ok(assignment, "Shift assigned to employee");
  }

  async updateShiftAssignment(id: string, user: AuthenticatedUser, dto: UpdateShiftAssignmentDto) {
    this.ensureAdmin(user);
    const setting = await this.getShiftConfigSetting();
    const value = (setting.value as any) ?? { shifts: [], assignments: [] };
    const shifts = value.shifts ?? [];
    const assignments = value.assignments ?? [];

    const index = assignments.findIndex((item: any) => item.id === id);
    if (index < 0) {
      throw new NotFoundException("Shift assignment not found");
    }

    if (dto.shiftId) {
      const shift = shifts.find((item: any) => item.id === dto.shiftId);
      if (!shift) {
        throw new NotFoundException("Shift template not found");
      }
    }

    assignments[index] = {
      ...assignments[index],
      ...dto,
    };

    setting.value = {
      ...value,
      assignments,
    };
    await this.companyRepository.save(setting);
    return ok(assignments[index], "Shift assignment updated");
  }

  async deleteShiftAssignment(id: string, user: AuthenticatedUser) {
    this.ensureAdmin(user);
    const setting = await this.getShiftConfigSetting();
    const value = (setting.value as any) ?? { shifts: [], assignments: [] };
    const assignments = value.assignments ?? [];
    const exists = assignments.some((item: any) => item.id === id);
    if (!exists) {
      throw new NotFoundException("Shift assignment not found");
    }

    setting.value = {
      ...value,
      assignments: assignments.filter((item: any) => item.id !== id),
    };
    await this.companyRepository.save(setting);
    return ok({ deleted: true }, "Shift assignment deleted");
  }
}
