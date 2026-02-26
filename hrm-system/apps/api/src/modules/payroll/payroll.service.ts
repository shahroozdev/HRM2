import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, Repository } from "typeorm";
import { Response } from "express";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { AuthenticatedUser } from "../../common/types/api.types";
import { LeaveRequestStatus, PayrollStatus, UserRole } from "../../common/types/enums";
import { ok } from "../../common/utils/response.util";
import { Employee, LeaveRequest, LeaveType, Payroll, SalaryStructure, Attendance } from "../../database/entities";
import { ProcessPayrollDto } from "./dto/process-payroll.dto";

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(Payroll) private readonly payrollRepository: Repository<Payroll>,
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(SalaryStructure) private readonly salaryStructureRepository: Repository<SalaryStructure>,
    @InjectRepository(Attendance) private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(LeaveRequest) private readonly leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(LeaveType) private readonly leaveTypeRepository: Repository<LeaveType>,
  ) {}

  async list(user: AuthenticatedUser, query: Record<string, string | undefined>) {
    const where: any = {};

    if (query.month) {
      where.month = Number(query.month);
    }

    if (query.year) {
      where.year = Number(query.year);
    }

    if (user.role === UserRole.EMPLOYEE) {
      const employee = await this.employeeRepository.findOne({ where: { userId: user.sub } });
      if (!employee) {
        return ok([], "Payroll records fetched", { total: 0 });
      }
      where.employeeId = employee.id;
    }

    if (user.role === UserRole.MANAGER) {
      const manager = await this.employeeRepository.findOne({ where: { userId: user.sub } });
      if (!manager) {
        return ok([], "Payroll records fetched", { total: 0 });
      }
      const team = await this.employeeRepository.find({ where: { reportingManagerId: manager.id }, select: { id: true } });
      where.employeeId = In([manager.id, ...team.map((item) => item.id)]);
    }

    const rows = await this.payrollRepository.find({
      where,
      relations: { employee: true },
      order: { year: "DESC", month: "DESC" },
    });
    return ok(rows, "Payroll records fetched", { total: rows.length });
  }

  async process(user: AuthenticatedUser, dto: ProcessPayrollDto) {
    if (user.role !== UserRole.HR_MANAGER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only HR and Super Admin can process payroll");
    }

    const employees = await this.employeeRepository.find({
      where: dto.employeeIds?.length ? { id: In(dto.employeeIds) } : {},
    });

    const leaveTypes = await this.leaveTypeRepository.find();
    const unpaidTypeIds = new Set(leaveTypes.filter((type) => !type.isPaid).map((type) => type.id));

    const processed: Payroll[] = [];
    for (const employee of employees) {
      const salary = await this.salaryStructureRepository.findOne({ where: { employeeId: employee.id } });
      if (!salary) {
        continue;
      }

      const from = `${dto.year}-${String(dto.month).padStart(2, "0")}-01`;
      const to = `${dto.year}-${String(dto.month).padStart(2, "0")}-31`;

      const attendanceRows = await this.attendanceRepository.find({
        where: { employeeId: employee.id, date: Between(from, to) },
      });
      const totalOvertimeMinutes = attendanceRows.reduce((sum, row) => sum + row.overtimeMinutes, 0);
      const overtimePay = (Number(salary.basicSalary) / 160 / 60) * totalOvertimeMinutes;

      const approvedLeaves = await this.leaveRequestRepository.find({
        where: {
          employeeId: employee.id,
          status: LeaveRequestStatus.APPROVED,
          startDate: Between(from, to),
        },
      });
      const unpaidLeaveDays = approvedLeaves
        .filter((leave) => unpaidTypeIds.has(leave.leaveTypeId))
        .reduce((sum, leave) => sum + leave.totalDays, 0);

      const dailyRate = Number(salary.basicSalary) / 30;
      const leaveDeductions = unpaidLeaveDays * dailyRate;

      const allowances =
        Number(salary.houseAllowance) + Number(salary.medicalAllowance) + Number(salary.transportAllowance);
      const bonus = dto.bonuses?.[employee.id] ?? 0;

      const grossSalary = Number(salary.basicSalary) + allowances + overtimePay + bonus;
      const taxDeduction = grossSalary * (Number(salary.taxRate) / 100);
      const netSalary = grossSalary - taxDeduction - leaveDeductions;

      let payroll = await this.payrollRepository.findOne({
        where: { employeeId: employee.id, month: dto.month, year: dto.year },
      });

      if (!payroll) {
        payroll = this.payrollRepository.create({
          employeeId: employee.id,
          month: dto.month,
          year: dto.year,
          basicSalary: Number(salary.basicSalary),
          totalAllowances: allowances,
          overtimePay,
          bonus,
          grossSalary,
          taxDeduction,
          leaveDeductions,
          netSalary,
          status: PayrollStatus.PROCESSED,
        });
      } else {
        Object.assign(payroll, {
          basicSalary: Number(salary.basicSalary),
          totalAllowances: allowances,
          overtimePay,
          bonus,
          grossSalary,
          taxDeduction,
          leaveDeductions,
          netSalary,
          status: PayrollStatus.PROCESSED,
        });
      }

      processed.push(await this.payrollRepository.save(payroll));
    }

    return ok(processed, "Payroll processed", { total: processed.length });
  }

  async payslip(id: string, user: AuthenticatedUser, res: Response) {
    const payroll = await this.payrollRepository.findOne({
      where: { id },
      relations: { employee: true },
    });
    if (!payroll) {
      throw new NotFoundException("Payroll record not found");
    }

    if (user.role === UserRole.EMPLOYEE) {
      const employee = await this.employeeRepository.findOne({ where: { userId: user.sub } });
      if (!employee || employee.id !== payroll.employeeId) {
        throw new ForbiddenException("No access to this payslip");
      }
    }

    if (user.role === UserRole.MANAGER) {
      const manager = await this.employeeRepository.findOne({ where: { userId: user.sub } });
      const isTeamMember = await this.employeeRepository.exists({
        where: { id: payroll.employeeId, reportingManagerId: manager?.id },
      });
      if (!manager || (!isTeamMember && manager.id !== payroll.employeeId)) {
        throw new ForbiddenException("No access to this payslip");
      }
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const drawText = (text: string, y: number, size = 12) => {
      page.drawText(text, { x: 50, y, size, font, color: rgb(0.1, 0.1, 0.1) });
    };

    drawText("HRM Payslip", 790, 20);
    drawText(`Employee: ${payroll.employee.firstName} ${payroll.employee.lastName}`, 760);
    drawText(`Period: ${payroll.month}/${payroll.year}`, 740);
    drawText(`Basic Salary: ${Number(payroll.basicSalary).toFixed(2)}`, 710);
    drawText(`Allowances: ${Number(payroll.totalAllowances).toFixed(2)}`, 690);
    drawText(`Overtime Pay: ${Number(payroll.overtimePay).toFixed(2)}`, 670);
    drawText(`Bonus: ${Number(payroll.bonus).toFixed(2)}`, 650);
    drawText(`Gross Salary: ${Number(payroll.grossSalary).toFixed(2)}`, 630);
    drawText(`Tax Deduction: ${Number(payroll.taxDeduction).toFixed(2)}`, 610);
    drawText(`Leave Deductions: ${Number(payroll.leaveDeductions).toFixed(2)}`, 590);
    drawText(`Net Salary: ${Number(payroll.netSalary).toFixed(2)}`, 560, 14);

    const bytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=payslip-${payroll.id}.pdf`);
    res.send(Buffer.from(bytes));
  }
}


