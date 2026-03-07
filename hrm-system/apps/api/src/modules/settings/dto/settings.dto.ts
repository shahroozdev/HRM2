import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsEmail, IsInt, IsObject, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateCompanyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}

export class CreateDepartmentDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  headId?: string;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  headId?: string;
}

export class CreateDesignationDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  departmentId!: string;
}

export class UpdateDesignationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;
}

export class CreateShiftDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ example: "09:00" })
  @IsString()
  startTime!: string;

  @ApiProperty({ example: "18:00" })
  @IsString()
  endTime!: string;

  @ApiPropertyOptional({ type: [String], example: ["saturday", "sunday"] })
  @IsOptional()
  @IsArray()
  weeklyOffDays?: string[];

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  breaks?: Array<{
    label: string;
    startTime: string;
    endTime: string;
    paid?: boolean;
  }>;

  @ApiPropertyOptional({ description: "Grace period before late status (minutes)", minimum: 0, maximum: 180, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(180)
  relaxationMinutes?: number;
}

export class UpdateShiftDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  weeklyOffDays?: string[];

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  breaks?: Array<{
    label: string;
    startTime: string;
    endTime: string;
    paid?: boolean;
  }>;

  @ApiPropertyOptional({ description: "Grace period before late status (minutes)", minimum: 0, maximum: 180 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(180)
  relaxationMinutes?: number;
}

export class CreateShiftAssignmentDto {
  @ApiProperty()
  @IsString()
  employeeId!: string;

  @ApiProperty()
  @IsString()
  shiftId!: string;

  @ApiProperty({ example: "2026-03-01" })
  @IsString()
  startDate!: string;

  @ApiProperty({ example: "2026-03-31" })
  @IsString()
  endDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateShiftAssignmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shiftId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateAccessPolicyDto {
  @ApiProperty({ type: Object })
  @IsObject()
  policy!: Record<string, unknown>;
}

export class UpdateSystemConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  databaseUri?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpHost?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpPort?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpUser?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpPass?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  smtpFrom?: string;
}

export class UpdateSlackIntegrationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  botToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signingSecret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultChannel?: string;
}

export class UpdateBiotimeIntegrationDto {
  @ApiPropertyOptional({ example: "https://your-ngrok-url.ngrok-free.dev" })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ example: "/personnel/api/employees/" })
  @IsOptional()
  @IsString()
  employeesEndpoint?: string;

  @ApiPropertyOptional({ example: "/iclock/api/transactions/" })
  @IsOptional()
  @IsString()
  attendanceEndpoint?: string;

  @ApiPropertyOptional({ example: "/iclock/api/transactions/" })
  @IsOptional()
  @IsString()
  logsEndpoint?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ default: 15 })
  @IsOptional()
  @IsString()
  pollIntervalSeconds?: string;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsString()
  lookbackMinutes?: string;
}

export class UpdateSlackEmailDto {
  @ApiProperty()
  @IsEmail()
  slackEmail!: string;
}
