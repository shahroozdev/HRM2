import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { differenceInCalendarDays } from "date-fns";
import { AuthenticatedUser } from "../../common/types/api.types";
import { LeaveRequestStatus, UserRole } from "../../common/types/enums";
import { ok } from "../../common/utils/response.util";
import { isAdminRole } from "../../common/utils/role.util";
import { Employee, LeaveRequest, LeaveType } from "../../database/entities";
import { ApplyLeaveDto, ReviewLeaveDto, UpdateLeaveDto } from "./dto/leave.dto";

@Injectable()
export class LeavesService {
  constructor(
    @InjectRepository(LeaveRequest) private readonly leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(LeaveType) private readonly leaveTypeRepository: Repository<LeaveType>,
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
  ) {}

  private async getCurrentEmployee(user: AuthenticatedUser): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({ where: { userId: user.sub } });
    if (!employee) {
      throw new NotFoundException("Employee profile not found");
    }
    return employee;
  }

  private async getCurrentEmployeeOptional(user: AuthenticatedUser): Promise<Employee | null> {
    return this.employeeRepository.findOne({ where: { userId: user.sub } });
  }

  private async ensureDefaultLeaveTypes(): Promise<LeaveType[]> {
    const existing = await this.leaveTypeRepository.find({ order: { name: "ASC" } });
    if (existing.length) {
      return existing;
    }

    const defaults = this.leaveTypeRepository.create([
      { name: "Full Day", totalDays: 24, isPaid: true },
      { name: "Partial Day", totalDays: 12, isPaid: true },
      { name: "Sick", totalDays: 12, isPaid: true },
      { name: "Other", totalDays: 6, isPaid: false },
    ]);
    await this.leaveTypeRepository.save(defaults);

    return this.leaveTypeRepository.find({ order: { name: "ASC" } });
  }

  private async ensureTeamAccess(user: AuthenticatedUser, targetEmployeeId: string): Promise<void> {
    if (isAdminRole(user.role)) {
      return;
    }

    const currentEmployee = await this.getCurrentEmployee(user);
    if (user.role === UserRole.EMPLOYEE && currentEmployee.id !== targetEmployeeId) {
      throw new ForbiddenException("Employees can access only their own leave data");
    }

    if (user.role === UserRole.MANAGER && currentEmployee.id !== targetEmployeeId) {
      const isTeamMember = await this.employeeRepository.exists({
        where: { id: targetEmployeeId, reportingManagerId: currentEmployee.id },
      });
      if (!isTeamMember) {
        throw new ForbiddenException("Managers can access only team leave data");
      }
    }
  }

  private async resolveScopedEmployeeIds(user: AuthenticatedUser): Promise<string[] | null> {
    if (isAdminRole(user.role)) {
      return null;
    }

    const currentEmployee = await this.getCurrentEmployee(user);
    if (user.role === UserRole.EMPLOYEE) {
      return [currentEmployee.id];
    }

    const teamMembers = await this.employeeRepository.find({
      where: { reportingManagerId: currentEmployee.id },
      select: { id: true },
    });
    return [currentEmployee.id, ...teamMembers.map((member) => member.id)];
  }

  async list(user: AuthenticatedUser) {
    const scopedIds = await this.resolveScopedEmployeeIds(user);
    const records = await this.leaveRequestRepository.find({
      where: scopedIds ? { employeeId: In(scopedIds) } : {},
      relations: { employee: true, leaveType: true, reviewer: true },
      order: { startDate: "DESC" },
    });

    return ok(records, "Leave requests fetched", { total: records.length });
  }

  async listTypes() {
    const types = await this.ensureDefaultLeaveTypes();
    return ok(types, "Leave types fetched", { total: types.length });
  }

  async apply(user: AuthenticatedUser, dto: ApplyLeaveDto) {
    await this.ensureDefaultLeaveTypes();
    const employeeId = dto.employeeId ?? (await this.getCurrentEmployee(user)).id;
    await this.ensureTeamAccess(user, employeeId);

    const leaveType = await this.leaveTypeRepository.findOne({ where: { id: dto.leaveTypeId } });
    if (!leaveType) {
      throw new NotFoundException("Leave type not found");
    }

    const totalDays = differenceInCalendarDays(new Date(dto.endDate), new Date(dto.startDate)) + 1;
    if (totalDays <= 0) {
      throw new ForbiddenException("Invalid leave dates");
    }

    const request = this.leaveRequestRepository.create({
      employeeId,
      leaveTypeId: dto.leaveTypeId,
      startDate: dto.startDate.slice(0, 10),
      endDate: dto.endDate.slice(0, 10),
      totalDays,
      reason: dto.reason,
      status: LeaveRequestStatus.PENDING,
      reviewedBy: null,
      reviewedAt: null,
      remarks: null,
    });

    await this.leaveRequestRepository.save(request);
    return ok(request, "Leave request submitted");
  }

  private async ensureCanManageLeave(user: AuthenticatedUser, leave: LeaveRequest): Promise<void> {
    if (isAdminRole(user.role)) {
      return;
    }

    const currentEmployee = await this.getCurrentEmployee(user);
    if (user.role === UserRole.EMPLOYEE) {
      if (leave.employeeId !== currentEmployee.id) {
        throw new ForbiddenException("Employees can manage only their own leave requests");
      }
      return;
    }

    if (user.role === UserRole.MANAGER) {
      if (leave.employeeId === currentEmployee.id) {
        return;
      }
      const isTeamMember = await this.employeeRepository.exists({
        where: { id: leave.employeeId, reportingManagerId: currentEmployee.id },
      });
      if (!isTeamMember) {
        throw new ForbiddenException("Managers can manage only team leave requests");
      }
    }
  }

  async update(id: string, user: AuthenticatedUser, dto: UpdateLeaveDto) {
    const leave = await this.leaveRequestRepository.findOne({ where: { id } });
    if (!leave) {
      throw new NotFoundException("Leave request not found");
    }

    await this.ensureCanManageLeave(user, leave);
    if (leave.status !== LeaveRequestStatus.PENDING) {
      throw new ForbiddenException("Only pending leave requests can be edited");
    }

    if (dto.leaveTypeId) {
      const leaveType = await this.leaveTypeRepository.findOne({ where: { id: dto.leaveTypeId } });
      if (!leaveType) {
        throw new NotFoundException("Leave type not found");
      }
      leave.leaveTypeId = dto.leaveTypeId;
    }

    if (dto.startDate) {
      leave.startDate = dto.startDate.slice(0, 10);
    }
    if (dto.endDate) {
      leave.endDate = dto.endDate.slice(0, 10);
    }
    if (dto.reason !== undefined) {
      leave.reason = dto.reason;
    }

    const totalDays = differenceInCalendarDays(new Date(leave.endDate), new Date(leave.startDate)) + 1;
    if (totalDays <= 0) {
      throw new ForbiddenException("Invalid leave dates");
    }
    leave.totalDays = totalDays;

    await this.leaveRequestRepository.save(leave);
    return ok(leave, "Leave request updated");
  }

  async remove(id: string, user: AuthenticatedUser) {
    const leave = await this.leaveRequestRepository.findOne({ where: { id } });
    if (!leave) {
      throw new NotFoundException("Leave request not found");
    }

    await this.ensureCanManageLeave(user, leave);
    if (leave.status !== LeaveRequestStatus.PENDING && !isAdminRole(user.role)) {
      throw new ForbiddenException("Only pending leave requests can be deleted");
    }

    await this.leaveRequestRepository.remove(leave);
    return ok({ deleted: true }, "Leave request deleted");
  }

  async approve(id: string, user: AuthenticatedUser, dto: ReviewLeaveDto) {
    const leave = await this.leaveRequestRepository.findOne({ where: { id } });
    if (!leave) {
      throw new NotFoundException("Leave request not found");
    }

    if (user.role === UserRole.EMPLOYEE) {
      throw new ForbiddenException("Employees cannot approve leaves");
    }

    if (leave.status !== LeaveRequestStatus.PENDING) {
      throw new ForbiddenException("Only pending leave requests can be approved");
    }

    if (user.role === UserRole.MANAGER) {
      const reviewer = await this.getCurrentEmployee(user);
      const isTeamMember = await this.employeeRepository.exists({
        where: { id: leave.employeeId, reportingManagerId: reviewer.id },
      });
      if (!isTeamMember) {
        throw new ForbiddenException("Managers can approve only team leaves");
      }
    }

    leave.status = LeaveRequestStatus.APPROVED;
    const reviewer = await this.getCurrentEmployeeOptional(user);
    leave.reviewedBy = reviewer?.id ?? null;
    leave.reviewedAt = new Date();
    leave.remarks = dto.remarks ?? null;
    await this.leaveRequestRepository.save(leave);

    return ok(leave, "Leave approved");
  }

  async reject(id: string, user: AuthenticatedUser, dto: ReviewLeaveDto) {
    const leave = await this.leaveRequestRepository.findOne({ where: { id } });
    if (!leave) {
      throw new NotFoundException("Leave request not found");
    }

    if (user.role === UserRole.EMPLOYEE) {
      throw new ForbiddenException("Employees cannot reject leaves");
    }

    if (leave.status !== LeaveRequestStatus.PENDING) {
      throw new ForbiddenException("Only pending leave requests can be rejected");
    }

    if (user.role === UserRole.MANAGER) {
      const reviewer = await this.getCurrentEmployee(user);
      const isTeamMember = await this.employeeRepository.exists({
        where: { id: leave.employeeId, reportingManagerId: reviewer.id },
      });
      if (!isTeamMember) {
        throw new ForbiddenException("Managers can reject only team leaves");
      }
    }

    leave.status = LeaveRequestStatus.REJECTED;
    const reviewer = await this.getCurrentEmployeeOptional(user);
    leave.reviewedBy = reviewer?.id ?? null;
    leave.reviewedAt = new Date();
    leave.remarks = dto.remarks ?? null;
    await this.leaveRequestRepository.save(leave);

    return ok(leave, "Leave rejected");
  }

  async balance(employeeId: string, user: AuthenticatedUser) {
    await this.ensureTeamAccess(user, employeeId);

    const leaveTypes = await this.leaveTypeRepository.find();
    const approved = await this.leaveRequestRepository.find({
      where: { employeeId, status: LeaveRequestStatus.APPROVED },
      relations: { leaveType: true },
    });

    const data = leaveTypes.map((type) => {
      const used = approved
        .filter((record) => record.leaveTypeId === type.id)
        .reduce((sum, item) => sum + item.totalDays, 0);
      return {
        leaveTypeId: type.id,
        leaveType: type.name,
        totalDays: type.totalDays,
        usedDays: used,
        remainingDays: Math.max(0, type.totalDays - used),
        isPaid: type.isPaid,
      };
    });

    return ok(data, "Leave balance fetched");
  }
}
