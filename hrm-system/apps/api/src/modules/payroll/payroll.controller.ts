import { Controller, Get, Param, Post, Query, Body, UseGuards, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/api.types";
import { UserRole } from "../../common/types/enums";
import { ProcessPayrollDto } from "./dto/process-payroll.dto";
import { PayrollService } from "./payroll.service";

@ApiTags("Payroll")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("payroll")
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "List payroll records" })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, string | undefined>) {
    return this.payrollService.list(user, query);
  }

  @Post("process")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Process payroll for selected month/year" })
  process(@CurrentUser() user: AuthenticatedUser, @Body() dto: ProcessPayrollDto) {
    return this.payrollService.process(user, dto);
  }

  @Get(":id/payslip")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "Download payslip PDF" })
  payslip(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    return this.payrollService.payslip(id, user, res);
  }
}
