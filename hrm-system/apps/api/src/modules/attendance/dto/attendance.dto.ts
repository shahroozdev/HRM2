import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { AttendanceStatus } from "../../../common/types/enums";

export class CheckInDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ example: "2026-02-24" })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckOutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ example: "2026-02-24" })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAttendanceDto {
  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
