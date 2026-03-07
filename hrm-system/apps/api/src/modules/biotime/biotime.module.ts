import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Attendance, CompanySetting, Department, Designation, Employee, User } from "../../database/entities";
import { BiotimeController } from "./biotime.controller";
import { BiotimeService } from "./biotime.service";

@Module({
  imports: [TypeOrmModule.forFeature([CompanySetting, Employee, User, Attendance, Department, Designation]), JwtModule.register({})],
  controllers: [BiotimeController],
  providers: [BiotimeService],
  exports: [BiotimeService],
})
export class BiotimeModule {}
