import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString } from "class-validator";

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

export class UpdateAccessPolicyDto {
  @ApiProperty({ type: Object })
  @IsObject()
  policy!: Record<string, unknown>;
}
