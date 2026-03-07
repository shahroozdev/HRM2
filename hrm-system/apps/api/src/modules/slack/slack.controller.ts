import { Body, Controller, Get, MessageEvent, Param, Post, Query, Sse, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { interval, Observable, from, switchMap, map } from "rxjs";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/api.types";
import { UserRole } from "../../common/types/enums";
import { CreateDepartmentChannelDto, MarkReadDto, OpenDmDto, SendMessageDto, TypingDto, UploadSlackFileDto } from "./dto/slack.dto";
import { SlackService } from "./slack.service";

@ApiTags("Slack")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER, UserRole.EMPLOYEE)
@Controller("slack")
export class SlackController {
  constructor(private readonly slackService: SlackService) {}

  @Get("users")
  @ApiOperation({ summary: "List HRM users with Slack mapping state" })
  users(@CurrentUser() user: AuthenticatedUser) {
    return this.slackService.listUsersWithSlack(user);
  }

  @Get("users/search")
  @ApiOperation({ summary: "Lookup Slack users for mentions" })
  searchUsers(@CurrentUser() user: AuthenticatedUser, @Query("q") q = "") {
    return this.slackService.searchSlackUsers(user, q);
  }

  @Post("dm/open")
  @ApiOperation({ summary: "Open a direct message conversation with another HRM user" })
  openDm(@CurrentUser() user: AuthenticatedUser, @Body() dto: OpenDmDto) {
    return this.slackService.openDm(user, dto.targetUserId);
  }

  @Get("conversations")
  @ApiOperation({ summary: "List Slack conversations for current mapped user" })
  conversations(@CurrentUser() user: AuthenticatedUser) {
    return this.slackService.listConversations(user);
  }

  @Get("conversations/:channelId/messages")
  @ApiOperation({ summary: "Get conversation messages" })
  messages(@CurrentUser() user: AuthenticatedUser, @Param("channelId") channelId: string) {
    return this.slackService.getMessages(user, channelId);
  }

  @Post("conversations/:channelId/messages")
  @ApiOperation({ summary: "Send message or thread reply" })
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param("channelId") channelId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.slackService.sendMessage(user, channelId, dto.text, dto.threadTs);
  }

  @Post("conversations/:channelId/upload")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  @ApiOperation({ summary: "Upload file attachment to Slack conversation" })
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param("channelId") channelId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadSlackFileDto,
  ) {
    return this.slackService.uploadFile(user, channelId, file, dto.text, dto.threadTs);
  }

  @Post("conversations/:channelId/typing")
  @ApiOperation({ summary: "Set typing status for realtime indicators" })
  typing(
    @CurrentUser() user: AuthenticatedUser,
    @Param("channelId") channelId: string,
    @Body() dto: TypingDto,
  ) {
    return this.slackService.setTyping(user, channelId, dto.isTyping);
  }

  @Post("conversations/:channelId/read")
  @ApiOperation({ summary: "Persist read receipt for conversation" })
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param("channelId") channelId: string,
    @Body() dto: MarkReadDto,
  ) {
    return this.slackService.markRead(user, channelId, dto.lastReadTs);
  }

  @Get("conversations/:channelId/read-receipts")
  @ApiOperation({ summary: "Get read receipts for conversation" })
  readReceipts(@CurrentUser() user: AuthenticatedUser, @Param("channelId") channelId: string) {
    return this.slackService.getReadReceipts(user, channelId);
  }

  @Get("conversations/:channelId/threads/:threadTs")
  @ApiOperation({ summary: "Get thread replies" })
  thread(
    @CurrentUser() user: AuthenticatedUser,
    @Param("channelId") channelId: string,
    @Param("threadTs") threadTs: string,
  ) {
    return this.slackService.getThreadReplies(user, channelId, threadTs);
  }

  @Post("channels/from-department/:departmentId")
  @Roles(UserRole.SUPER_ADMIN, UserRole.HR_MANAGER)
  @ApiOperation({ summary: "Create Slack channel from HRM department and invite mapped users" })
  createFromDepartment(
    @CurrentUser() user: AuthenticatedUser,
    @Param("departmentId") departmentId: string,
    @Body() dto: CreateDepartmentChannelDto,
  ) {
    return this.slackService.createChannelFromDepartment(user, departmentId, dto.isPrivate ?? true, dto.prefix ?? "dept");
  }

  @Sse("conversations/:channelId/stream")
  @ApiQuery({ name: "token", required: true })
  @ApiOperation({ summary: "SSE real-time stream for conversation messages" })
  stream(
    @Param("channelId") channelId: string,
    @Query("token") token: string,
  ): Observable<MessageEvent> {
    return from(this.slackService.validateStreamToken(token)).pipe(
      switchMap((user) =>
        interval(2500).pipe(
          switchMap(() => from(this.slackService.getMessagesForStream(user, channelId))),
          map((payload) => ({ data: { channelId, ...payload, at: Date.now() } })),
        ),
      ),
    );
  }
}
