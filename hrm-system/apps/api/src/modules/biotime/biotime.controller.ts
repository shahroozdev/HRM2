import { Body, Controller, Get, MessageEvent, Post, Query, Sse, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { from, interval, map, merge, Observable, switchMap } from "rxjs";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { UserRole } from "../../common/types/enums";
import { BiotimeService } from "./biotime.service";
import { SyncAttendanceDto } from "./dto/biotime.dto";

@ApiTags("BioTime")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
@Controller("biotime")
export class BiotimeController {
  constructor(private readonly biotimeService: BiotimeService) {}

  @Get("status")
  @ApiOperation({ summary: "Get BioTime bridge sync status and runtime state" })
  status() {
    return this.biotimeService.getStatus();
  }

  @Post("sync/employees")
  @ApiOperation({ summary: "Manual sync of employees from BioTime bridge" })
  syncEmployees() {
    return this.biotimeService.syncEmployees();
  }

  @Post("sync/attendance")
  @ApiOperation({ summary: "Manual sync of attendance logs from BioTime bridge" })
  syncAttendance(@Body() dto: SyncAttendanceDto) {
    return this.biotimeService.syncAttendance(dto);
  }

  @Sse("stream")
  @ApiQuery({ name: "token", required: true })
  @ApiOperation({ summary: "Realtime SSE stream for imported biometric attendance events" })
  stream(@Query("token") token: string): Observable<MessageEvent> {
    return from(this.biotimeService.validateStreamToken(token)).pipe(
      switchMap(() =>
        merge(
          this.biotimeService.getEventStream().pipe(map((event) => ({ data: event }))),
          interval(15000).pipe(map(() => ({ data: { type: "heartbeat", at: Date.now() } }))),
        ),
      ),
    );
  }
}
