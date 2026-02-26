import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/api.types";
import { UserRole } from "../../common/types/enums";
import { ReportsService } from "./reports.service";

@ApiTags("Reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("attendance-summary")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER)
  @ApiOperation({ summary: "Attendance summary report" })
  attendanceSummary(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, string | undefined>) {
    return this.reportsService.attendanceSummary(user, query);
  }

  @Get("leave-utilization")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER)
  leaveUtilization(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.leaveUtilization(user);
  }

  @Get("salary-expense")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  salaryExpense(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, string | undefined>) {
    return this.reportsService.salaryExpense(user, query);
  }

  @Get("department-analytics")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  departmentAnalytics(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.departmentAnalytics(user);
  }
}
