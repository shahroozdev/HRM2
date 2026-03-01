import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { AuthenticatedUser } from "../../common/types/api.types";
import { EmployeeStatus, UserRole } from "../../common/types/enums";
import { ok } from "../../common/utils/response.util";
import { isAdminRole } from "../../common/utils/role.util";
import { deleteCloudinaryAssetByUrl, uploadBufferToCloudinary } from "../../common/utils/cloudinary.util";
import { Department, Designation, Employee, User } from "../../database/entities";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeStatusDto } from "./dto/update-employee-status.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Department) private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Designation) private readonly designationRepository: Repository<Designation>,
    private readonly dataSource: DataSource,
  ) {}

  private async getEmployeeByUserId(userId: string): Promise<Employee | null> {
    return this.employeeRepository.findOne({ where: { userId } });
  }

  private async ensureCanAccessEmployee(user: AuthenticatedUser, employeeId: string): Promise<void> {
    if (isAdminRole(user.role)) {
      return;
    }

    const currentEmployee = await this.getEmployeeByUserId(user.sub);
    if (!currentEmployee) {
      throw new ForbiddenException("Employee profile not found");
    }

    if (user.role === UserRole.EMPLOYEE && currentEmployee.id !== employeeId) {
      throw new ForbiddenException("You can access only your own profile");
    }

    if (user.role === UserRole.MANAGER && currentEmployee.id !== employeeId) {
      const isTeamMember = await this.employeeRepository.exists({
        where: { id: employeeId, reportingManagerId: currentEmployee.id },
      });
      if (!isTeamMember) {
        throw new ForbiddenException("You can access only your team members");
      }
    }
  }

  async create(dto: CreateEmployeeDto) {
    if (dto.departmentId) {
      const department = await this.departmentRepository.findOne({ where: { id: dto.departmentId } });
      if (!department) {
        throw new NotFoundException("Department not found");
      }
    }

    if (dto.designationId) {
      const designation = await this.designationRepository.findOne({ where: { id: dto.designationId } });
      if (!designation) {
        throw new NotFoundException("Designation not found");
      }
    }

    const employee = await this.dataSource.transaction(async (manager) => {
      const existingUser = await manager.findOne(User, { where: { email: dto.email } });
      if (existingUser) {
        throw new ForbiddenException("Email already in use");
      }

      const user = manager.create(User, {
        email: dto.email,
        password: await bcrypt.hash(dto.password, 10),
        role: dto.role ?? UserRole.EMPLOYEE,
        isActive: true,
      });
      const savedUser = await manager.save(user);

      const totalEmployees = await manager.count(Employee);
      const employeeCode = `EMP-${String(totalEmployees + 1).padStart(4, "0")}`;

      const employeeRecord = manager.create(Employee, {
        employeeId: employeeCode,
        userId: savedUser.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        avatar: null,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        cnic: dto.cnic ?? null,
        emergencyContact: dto.emergencyContact ?? null,
        departmentId: dto.departmentId ?? null,
        designationId: dto.designationId ?? null,
        reportingManagerId: dto.reportingManagerId ?? null,
        joinDate: dto.joinDate,
        employmentType: dto.employmentType,
        workLocation: dto.workLocation ?? null,
        status: dto.status ?? EmployeeStatus.ACTIVE,
      });

      return manager.save(employeeRecord);
    });

    return ok(employee, "Employee created successfully");
  }

  async findAll(user: AuthenticatedUser) {
    if (isAdminRole(user.role)) {
      const data = await this.employeeRepository.find({
        relations: { user: true, department: true, designation: true, reportingManager: true },
      });
      return ok(data, "Employees fetched", { total: data.length });
    }

    const self = await this.getEmployeeByUserId(user.sub);
    if (!self) {
      return ok([], "Employees fetched", { total: 0 });
    }

    if (user.role === UserRole.EMPLOYEE) {
      const own = await this.employeeRepository.findOne({
        where: { id: self.id },
        relations: { user: true, department: true, designation: true, reportingManager: true },
      });
      return ok(own ? [own] : [], "Employees fetched", { total: own ? 1 : 0 });
    }

    const ids = [self.id];
    const team = await this.employeeRepository.find({
      where: { reportingManagerId: self.id },
      select: { id: true },
    });
    ids.push(...team.map((t) => t.id));

    const data = await this.employeeRepository.find({
      where: { id: In(ids) },
      relations: { user: true, department: true, designation: true, reportingManager: true },
    });

    return ok(data, "Employees fetched", { total: data.length });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    await this.ensureCanAccessEmployee(user, id);

    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: { user: true, department: true, designation: true, reportingManager: true },
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    return ok(employee, "Employee fetched");
  }

  async update(id: string, dto: UpdateEmployeeDto, user: AuthenticatedUser) {
    await this.ensureCanAccessEmployee(user, id);

    const employee = await this.employeeRepository.findOne({ where: { id }, relations: { user: true } });
    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    if (dto.email) {
      employee.user.email = dto.email;
      await this.userRepository.save(employee.user);
    }

    if (dto.password) {
      employee.user.password = await bcrypt.hash(dto.password, 10);
      await this.userRepository.save(employee.user);
    }

    Object.assign(employee, {
      ...dto,
      email: undefined,
      password: undefined,
      role: undefined,
    });

    if (dto.role) {
      employee.user.role = dto.role;
      await this.userRepository.save(employee.user);
    }

    const updated = await this.employeeRepository.save(employee);
    return ok(updated, "Employee updated");
  }

  async updateStatus(id: string, dto: UpdateEmployeeStatusDto, user: AuthenticatedUser) {
    if (!isAdminRole(user.role)) {
      throw new ForbiddenException("Only HR and Super Admin can update status");
    }

    const employee = await this.employeeRepository.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    employee.status = dto.status;
    await this.employeeRepository.save(employee);

    return ok(employee, "Employee status updated");
  }

  async uploadAvatar(id: string, file: Express.Multer.File, user: AuthenticatedUser) {
    await this.ensureCanAccessEmployee(user, id);

    const employee = await this.employeeRepository.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    if (!file) {
      throw new ForbiddenException("Avatar file is required");
    }

    if (!file.mimetype?.startsWith("image/")) {
      throw new ForbiddenException("Only image files are allowed");
    }

    const uploaded = await uploadBufferToCloudinary(file, {
      folder: "hrm/avatars",
      resource_type: "image",
      use_filename: true,
      unique_filename: true,
    });

    await deleteCloudinaryAssetByUrl(employee.avatar);
    employee.avatar = uploaded.secure_url;
    await this.employeeRepository.save(employee);

    return ok(employee, "Avatar uploaded");
  }

  async remove(id: string, user: AuthenticatedUser) {
    if (!isAdminRole(user.role)) {
      throw new ForbiddenException("Only HR and Super Admin can delete employee");
    }

    const employee = await this.employeeRepository.findOne({ where: { id }, relations: { user: true } });
    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    await this.employeeRepository.remove(employee);
    await this.userRepository.delete(employee.userId);

    return ok({ deleted: true }, "Employee deleted");
  }
}
