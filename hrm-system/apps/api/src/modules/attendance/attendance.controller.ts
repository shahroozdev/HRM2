import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/api.types";
import { UserRole } from "../../common/types/enums";
import { AttendanceService } from "./attendance.service";
import { CheckInDto, CheckOutDto, UpdateAttendanceDto } from "./dto/attendance.dto";

@ApiTags("Attendance")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Missing or invalid bearer token" })
@ApiForbiddenResponse({ description: "Insufficient role permissions" })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("attendance")
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "Get attendance list" })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, string | undefined>) {
    return this.attendanceService.list(user, query);
  }

  @Post("check-in")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "Check in for the current user" })
  checkIn(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(user, dto);
  }

  @Post("check-out")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "Check out for the current user" })
  checkOut(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckOutDto) {
    return this.attendanceService.checkOut(user, dto);
  }

  @Put(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Update attendance record by id" })
  update(@Param("id") id: string, @Body() dto: UpdateAttendanceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.update(id, dto, user);
  }

  @Get("report")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER)
  @ApiOperation({ summary: "Generate attendance report" })
  report(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, string | undefined>) {
    return this.attendanceService.report(user, query);
  }
}
