import { Body, Controller, Get, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/api.types";
import { UserRole } from "../../common/types/enums";
import { CreateDepartmentDto, UpdateCompanyDto } from "./dto/settings.dto";
import { SettingsService } from "./settings.service";

@ApiTags("Settings")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Missing or invalid bearer token" })
@ApiForbiddenResponse({ description: "Insufficient role permissions" })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get("company")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Get company settings" })
  getCompany(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getCompany(user);
  }

  @Put("company")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Update company settings" })
  updateCompany(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateCompanyDto) {
    return this.settingsService.updateCompany(user, dto);
  }

  @Get("departments")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Get departments list" })
  getDepartments(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getDepartments(user);
  }

  @Post("departments")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Create department" })
  createDepartment(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDepartmentDto) {
    return this.settingsService.createDepartment(user, dto);
  }

  @Get("designations")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Get designations list" })
  getDesignations(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getDesignations(user);
  }
}
