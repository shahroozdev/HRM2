import { Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/api.types";
import { UserRole } from "../../common/types/enums";
import { NotificationsService } from "./notifications.service";

@ApiTags("Notifications")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Missing or invalid bearer token" })
@ApiForbiddenResponse({ description: "Insufficient role permissions" })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "Get notifications" })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.list(user);
  }

  @Patch(":id/read")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "Mark single notification as read" })
  markRead(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markRead(id, user);
  }

  @Patch("read-all")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "Mark all notifications as read" })
  readAll(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.readAll(user);
  }
}
