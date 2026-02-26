import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Attendance, Department, Employee, LeaveRequest, Payroll } from "../../database/entities";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [TypeOrmModule.forFeature([Attendance, LeaveRequest, Payroll, Department, Employee])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
