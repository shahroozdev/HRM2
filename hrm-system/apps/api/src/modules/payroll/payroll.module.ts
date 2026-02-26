import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Attendance, Employee, LeaveRequest, LeaveType, Payroll, SalaryStructure } from "../../database/entities";
import { PayrollController } from "./payroll.controller";
import { PayrollService } from "./payroll.service";

@Module({
  imports: [TypeOrmModule.forFeature([Payroll, Employee, SalaryStructure, Attendance, LeaveRequest, LeaveType])],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
