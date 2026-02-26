import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthenticatedUser } from "../../common/types/api.types";
import { UserRole } from "../../common/types/enums";
import { ok } from "../../common/utils/response.util";
import { CompanySetting, Department, Designation, Employee } from "../../database/entities";
import { CreateDepartmentDto, UpdateCompanyDto } from "./dto/settings.dto";

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

  async getDesignations(user: AuthenticatedUser) {
    this.ensureAdmin(user);

    const rows = await this.designationRepository.find({ relations: { department: true } });
    return ok(rows, "Designations fetched", { total: rows.length });
  }
}
