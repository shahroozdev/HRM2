import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Employee, LeaveRequest, LeaveType } from "../../database/entities";
import { LeavesController } from "./leaves.controller";
import { LeavesService } from "./leaves.service";

@Module({
  imports: [TypeOrmModule.forFeature([LeaveRequest, LeaveType, Employee])],
  controllers: [LeavesController],
  providers: [LeavesService],
  exports: [LeavesService],
})
export class LeavesModule {}
