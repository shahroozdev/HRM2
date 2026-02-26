import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { EmployeeStatus } from "../../../common/types/enums";

export class UpdateEmployeeStatusDto {
  @ApiProperty({ enum: EmployeeStatus })
  @IsEnum(EmployeeStatus)
  status!: EmployeeStatus;
}
