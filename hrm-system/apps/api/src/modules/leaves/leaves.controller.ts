import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/api.types";
import { UserRole } from "../../common/types/enums";
import { ApplyLeaveDto, ReviewLeaveDto } from "./dto/leave.dto";
import { LeavesService } from "./leaves.service";

@ApiTags("Leaves")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Missing or invalid bearer token" })
@ApiForbiddenResponse({ description: "Insufficient role permissions" })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("leaves")
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "Get leave list" })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.leavesService.list(user);
  }

  @Post("apply")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "Apply for leave" })
  apply(@CurrentUser() user: AuthenticatedUser, @Body() dto: ApplyLeaveDto) {
    return this.leavesService.apply(user, dto);
  }

  @Put(":id/approve")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER)
  @ApiOperation({ summary: "Approve leave request by id" })
  approve(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: ReviewLeaveDto) {
    return this.leavesService.approve(id, user, dto);
  }

  @Put(":id/reject")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER)
  @ApiOperation({ summary: "Reject leave request by id" })
  reject(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: ReviewLeaveDto) {
    return this.leavesService.reject(id, user, dto);
  }

  @Get("balance/:employeeId")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "Get leave balance for employee" })
  balance(@Param("employeeId") employeeId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.leavesService.balance(employeeId, user);
  }
}
