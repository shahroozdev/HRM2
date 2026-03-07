import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class SyncAttendanceDto {
  @ApiPropertyOptional({ example: "2026-03-05T00:00:00Z" })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: "2026-03-05T23:59:59Z" })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  resetData?: boolean;
}
