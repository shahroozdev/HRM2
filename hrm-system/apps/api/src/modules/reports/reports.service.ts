import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthenticatedUser } from "../../common/types/api.types";
import { UserRole } from "../../common/types/enums";
import { ok } from "../../common/utils/response.util";
import { Attendance, Department, Employee, LeaveRequest, Payroll } from "../../database/entities";

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Attendance) private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(LeaveRequest) private readonly leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(Payroll) private readonly payrollRepository: Repository<Payroll>,
    @InjectRepository(Department) private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
  ) {}

  private ensureAccess(user: AuthenticatedUser): void {
    if (user.role === UserRole.EMPLOYEE) {
      throw new ForbiddenException("Employees are not authorized for reports");
    }
  }

  async attendanceSummary(user: AuthenticatedUser, query: Record<string, string | undefined>) {
    this.ensureAccess(user);

    const qb = this.attendanceRepository
      .createQueryBuilder("a")
      .select("a.status", "status")
      .addSelect("COUNT(*)::int", "count");

    if (query.from && query.to) {
      qb.where("a.date BETWEEN :from AND :to", { from: query.from, to: query.to });
    }

    const data = await qb.groupBy("a.status").getRawMany();
    return ok(data, "Attendance summary generated");
  }

  async leaveUtilization(user: AuthenticatedUser) {
    this.ensureAccess(user);

    const data = await this.leaveRequestRepository
      .createQueryBuilder("l")
      .leftJoin("l.leaveType", "lt")
      .select("lt.name", "leaveType")
      .addSelect("SUM(l.totalDays)::int", "days")
      .addSelect("l.status", "status")
      .groupBy("lt.name")
      .addGroupBy("l.status")
      .getRawMany();

    return ok(data, "Leave utilization generated");
  }

  async salaryExpense(user: AuthenticatedUser, query: Record<string, string | undefined>) {
    this.ensureAccess(user);

    const qb = this.payrollRepository
      .createQueryBuilder("p")
      .select("p.year", "year")
      .addSelect("p.month", "month")
      .addSelect("SUM(p.netSalary)::numeric", "netExpense")
      .groupBy("p.year")
      .addGroupBy("p.month")
      .orderBy("p.year", "DESC")
      .addOrderBy("p.month", "DESC");

    if (query.year) {
      qb.where("p.year = :year", { year: Number(query.year) });
    }

    const data = await qb.getRawMany();
    return ok(data, "Salary expense report generated");
  }

  async departmentAnalytics(user: AuthenticatedUser) {
    this.ensureAccess(user);

    const departments = await this.departmentRepository.find();
    const data = [] as Array<{ department: string; employeeCount: number; managerCount: number }>;

    for (const department of departments) {
      const employees = await this.employeeRepository.find({ where: { departmentId: department.id }, relations: { user: true } });
      data.push({
        department: department.name,
        employeeCount: employees.length,
        managerCount: employees.filter((employee) => employee.user?.role === UserRole.MANAGER).length,
      });
    }

    return ok(data, "Department analytics generated");
  }
}
