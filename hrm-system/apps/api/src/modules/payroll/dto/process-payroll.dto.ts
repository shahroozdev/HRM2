import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsInt, IsObject, IsOptional, Max, Min } from "class-validator";

export class ProcessPayrollDto {
  @ApiProperty({ minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ minimum: 2020 })
  @IsInt()
  @Min(2020)
  year!: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  employeeIds?: string[];

  @ApiPropertyOptional({ description: "Map of employeeId to bonus amount", type: Object })
  @IsOptional()
  @IsObject()
  bonuses?: Record<string, number>;
}
