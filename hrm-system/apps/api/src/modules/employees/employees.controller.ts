import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { ConfigService } from "@nestjs/config";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/api.types";
import { UserRole } from "../../common/types/enums";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeStatusDto } from "./dto/update-employee-status.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { EmployeesService } from "./employees.service";

@ApiTags("Employees")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Missing or invalid bearer token" })
@ApiForbiddenResponse({ description: "Insufficient role permissions" })
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("employees")
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Create employee" })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "Get employees with role-based scoping" })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.findAll(user);
  }

  @Get(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "Get single employee by id" })
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.findOne(id, user);
  }

  @Put(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "Update employee by id" })
  update(@Param("id") id: string, @Body() dto: UpdateEmployeeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.update(id, dto, user);
  }

  @Patch(":id/status")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Update employee status by id" })
  updateStatus(@Param("id") id: string, @Body() dto: UpdateEmployeeStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.updateStatus(id, dto, user);
  }

  @Post(":id/avatar")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
  @UseInterceptors(
    FileInterceptor("avatar", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, join(process.cwd(), process.env.UPLOAD_DIR ?? "uploads", "avatars"));
        },
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload employee avatar" })
  uploadAvatar(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const uploadDir = this.configService.get<string>("UPLOAD_DIR", "uploads").replace(/\\/g, "/");
    const relativePath = `/${uploadDir}/avatars/${file.filename}`.replace("//", "/");
    return this.employeesService.uploadAvatar(id, relativePath, user);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Delete employee by id" })
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.remove(id, user);
  }
}

