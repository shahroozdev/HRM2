import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CompanySetting, Department, Designation, Employee, User } from "../../database/entities";
import { SettingsController } from "./settings.controller";
import { SettingsService } from "./settings.service";

@Module({
  imports: [TypeOrmModule.forFeature([CompanySetting, Department, Designation, Employee, User])],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
