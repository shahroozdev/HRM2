import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/api.types";
import { UserRole } from "../../common/types/enums";
import { CreateDepartmentDto, CreateDesignationDto, CreateShiftAssignmentDto, CreateShiftDto, UpdateAccessPolicyDto, UpdateBiotimeIntegrationDto, UpdateCompanyDto, UpdateDepartmentDto, UpdateDesignationDto, UpdateShiftAssignmentDto, UpdateShiftDto, UpdateSlackEmailDto, UpdateSlackIntegrationDto, UpdateSystemConfigDto } from "./dto/settings.dto";
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

  @Put("departments/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Update department" })
  updateDepartment(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateDepartmentDto) {
    return this.settingsService.updateDepartment(id, user, dto);
  }

  @Delete("departments/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Delete department" })
  deleteDepartment(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.deleteDepartment(id, user);
  }

  @Get("designations")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Get designations list" })
  getDesignations(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getDesignations(user);
  }

  @Post("designations")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Create designation" })
  createDesignation(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDesignationDto) {
    return this.settingsService.createDesignation(user, dto);
  }

  @Put("designations/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Update designation" })
  updateDesignation(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateDesignationDto) {
    return this.settingsService.updateDesignation(id, user, dto);
  }

  @Delete("designations/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Delete designation" })
  deleteDesignation(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.deleteDesignation(id, user);
  }

  @Get("shifts")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Get shift templates" })
  getShifts(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getShifts(user);
  }

  @Post("shifts")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Create shift template with break times" })
  createShift(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateShiftDto) {
    return this.settingsService.createShift(user, dto);
  }

  @Put("shifts/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Update shift template" })
  updateShift(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateShiftDto) {
    return this.settingsService.updateShift(id, user, dto);
  }

  @Delete("shifts/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Delete shift template" })
  deleteShift(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.deleteShift(id, user);
  }

  @Get("shift-assignments")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Get employee shift assignments" })
  getShiftAssignments(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getShiftAssignments(user);
  }

  @Post("shift-assignments")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Assign shift to employee for date range" })
  createShiftAssignment(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateShiftAssignmentDto) {
    return this.settingsService.createShiftAssignment(user, dto);
  }

  @Put("shift-assignments/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Update employee shift assignment" })
  updateShiftAssignment(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateShiftAssignmentDto) {
    return this.settingsService.updateShiftAssignment(id, user, dto);
  }

  @Delete("shift-assignments/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Delete employee shift assignment" })
  deleteShiftAssignment(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.deleteShiftAssignment(id, user);
  }

  @Get("access-policy")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "Get ABAC access policy used by frontend navigation/actions" })
  getAccessPolicy(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getAccessPolicy(user);
  }

  @Put("access-policy")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Update ABAC access policy (Super Admin only)" })
  updateAccessPolicy(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateAccessPolicyDto) {
    return this.settingsService.updateAccessPolicy(user, dto);
  }

  @Get("system-config")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Get encrypted template config (DB/SMTP) with masked values" })
  getSystemConfig(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getSystemConfig(user);
  }

  @Put("system-config")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Save encrypted template config (DB/SMTP)" })
  updateSystemConfig(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateSystemConfigDto) {
    return this.settingsService.updateSystemConfig(user, dto);
  }

  @Get("integrations/slack")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Get Slack integration settings (masked)" })
  getSlackIntegration(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getSlackIntegration(user);
  }

  @Put("integrations/slack")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Save Slack integration settings encrypted" })
  updateSlackIntegration(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateSlackIntegrationDto) {
    return this.settingsService.updateSlackIntegration(user, dto);
  }

  @Get("integrations/biotime")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Get BioTime bridge integration settings (secure)" })
  getBiotimeIntegration(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getBiotimeIntegration(user);
  }

  @Put("integrations/biotime")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Save BioTime bridge integration settings encrypted" })
  updateBiotimeIntegration(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateBiotimeIntegrationDto) {
    return this.settingsService.updateBiotimeIntegration(user, dto);
  }

  @Get("profile/slack-email")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "Get current user's Slack email" })
  getMySlackEmail(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getMySlackEmail(user);
  }

  @Put("profile/slack-email")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "Save current user's Slack email" })
  updateMySlackEmail(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateSlackEmailDto) {
    return this.settingsService.updateMySlackEmail(user, dto);
  }
}
