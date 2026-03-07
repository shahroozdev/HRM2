import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthenticatedUser, JwtPayload } from "../../common/types/api.types";
import { UserRole } from "../../common/types/enums";
import { decryptJson } from "../../common/utils/crypto.util";
import { ok } from "../../common/utils/response.util";
import { CompanySetting, Department, Employee, SlackReadReceipt, User } from "../../database/entities";

type SlackSecrets = {
  botToken: string;
  signingSecret: string;
  appToken: string;
  defaultChannel: string;
};

@Injectable()
export class SlackService {
  private readonly typingState = new Map<string, Map<string, number>>();
  private readonly presenceState = new Map<string, number>();

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(CompanySetting) private readonly companySettingRepository: Repository<CompanySetting>,
    @InjectRepository(Department) private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(SlackReadReceipt) private readonly slackReadReceiptRepository: Repository<SlackReadReceipt>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  private cleanupRealtimeState(): void {
    const now = Date.now();

    for (const [channelId, channelTyping] of this.typingState.entries()) {
      for (const [userId, expiresAt] of channelTyping.entries()) {
        if (expiresAt <= now) channelTyping.delete(userId);
      }
      if (channelTyping.size === 0) this.typingState.delete(channelId);
    }

    for (const [userId, seenAt] of this.presenceState.entries()) {
      if (now - seenAt > 120_000) this.presenceState.delete(userId);
    }
  }

  private touchPresence(userId: string): void {
    this.presenceState.set(userId, Date.now());
  }

  private getTypingUsers(channelId: string): string[] {
    this.cleanupRealtimeState();
    return Array.from(this.typingState.get(channelId)?.keys() ?? []);
  }

  private getOnlineUsers(): string[] {
    this.cleanupRealtimeState();
    return Array.from(this.presenceState.keys());
  }

  private getEncryptionSecret(): string {
    return this.configService.get<string>("SETTINGS_ENCRYPTION_KEY") ?? this.configService.get<string>("JWT_SECRET", "fallback-secret");
  }

  async validateStreamToken(token: string): Promise<AuthenticatedUser> {
    if (!token) {
      throw new ForbiddenException("Missing stream token");
    }

    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.get<string>("JWT_SECRET", "dev-secret"),
    });

    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new ForbiddenException("Invalid stream token");
    }

    this.touchPresence(payload.sub);
    return payload;
  }

  private async getSlackSecrets(): Promise<SlackSecrets> {
    const setting = await this.companySettingRepository.findOne({ where: { key: "slack_integration_secure" } });
    if (!setting) throw new NotFoundException("Slack integration is not configured");

    const raw = setting.value as Record<string, unknown>;
    if (!raw?.encrypted || !raw?.payload) throw new NotFoundException("Slack integration is not configured securely");

    const decrypted = decryptJson<SlackSecrets>(raw.payload as any, this.getEncryptionSecret());
    if (!decrypted.botToken) throw new NotFoundException("Slack bot token is missing");
    return decrypted;
  }

  private async slackFetch(path: string, token: string, body?: Record<string, unknown>): Promise<any> {
    const response = await fetch(`https://slack.com/api/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body ?? {}),
    });

    const payload = await response.json();
    if (!payload?.ok) {
      throw new ForbiddenException(payload?.error ?? "Slack API request failed");
    }

    return payload;
  }

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9-\s]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 70);
  }

  private async resolveSlackIdByEmail(token: string, email: string): Promise<string> {
    const payload = await this.slackFetch("users.lookupByEmail", token, { email });
    const id = payload?.user?.id;
    if (!id) throw new NotFoundException(`Slack user not found for ${email}`);
    return id;
  }

  async setTyping(currentUser: AuthenticatedUser, channelId: string, isTyping: boolean) {
    this.touchPresence(currentUser.sub);
    const channel = this.typingState.get(channelId) ?? new Map<string, number>();
    if (isTyping) {
      channel.set(currentUser.sub, Date.now() + 10_000);
      this.typingState.set(channelId, channel);
    } else {
      channel.delete(currentUser.sub);
      if (channel.size === 0) this.typingState.delete(channelId);
      else this.typingState.set(channelId, channel);
    }

    return ok({ channelId, isTyping }, "Typing state updated");
  }

  async markRead(currentUser: AuthenticatedUser, channelId: string, lastReadTs?: string) {
    this.touchPresence(currentUser.sub);
    let receipt = await this.slackReadReceiptRepository.findOne({ where: { userId: currentUser.sub, channelId } });
    if (!receipt) {
      receipt = this.slackReadReceiptRepository.create({ userId: currentUser.sub, channelId, lastReadTs: lastReadTs ?? null });
    } else {
      receipt.lastReadTs = lastReadTs ?? receipt.lastReadTs;
    }
    await this.slackReadReceiptRepository.save(receipt);

    return ok({ channelId, lastReadTs: receipt.lastReadTs }, "Read receipt saved");
  }

  async getReadReceipts(_currentUser: AuthenticatedUser, channelId: string) {
    const rows = await this.slackReadReceiptRepository.find({ where: { channelId } });
    return ok(rows.map((r) => ({ userId: r.userId, channelId: r.channelId, lastReadTs: r.lastReadTs, updatedAt: r.updatedAt })), "Read receipts fetched");
  }

  async searchSlackUsers(currentUser: AuthenticatedUser, query: string) {
    const secrets = await this.getSlackSecrets();
    const q = query.trim().toLowerCase();
    if (!q) {
      return ok([], "Slack user lookup empty");
    }

    const response = await this.slackFetch("users.list", secrets.botToken, { limit: 500 });
    const members = (response.members ?? [])
      .filter((m: any) => !m.deleted && !m.is_bot)
      .map((m: any) => ({
        id: m.id,
        name: m.real_name || m.name || "Unknown",
        username: m.name || "",
        email: m.profile?.email || "",
      }))
      .filter((m: any) =>
        [m.name, m.username, m.email]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 30);

    return ok(members, "Slack user lookup fetched", { requestedBy: currentUser.sub });
  }

  async listUsersWithSlack(currentUser: AuthenticatedUser) {
    this.touchPresence(currentUser.sub);
    const users = await this.userRepository.find({
      where: { isActive: true },
      select: { id: true, email: true, role: true, slackEmail: true },
      order: { email: "ASC" },
    });

    return ok(
      users
        .filter((u) => u.id !== currentUser.sub)
        .map((u) => ({ id: u.id, email: u.email, role: u.role, slackEmail: u.slackEmail, linked: Boolean(u.slackEmail), online: this.getOnlineUsers().includes(u.id) })),
      "Slack users fetched",
    );
  }

  async openDm(currentUser: AuthenticatedUser, targetUserId: string) {
    this.touchPresence(currentUser.sub);
    const secrets = await this.getSlackSecrets();
    const source = await this.userRepository.findOne({ where: { id: currentUser.sub } });
    const target = await this.userRepository.findOne({ where: { id: targetUserId } });

    if (!source || !target) throw new NotFoundException("User not found");
    if (!source.slackEmail) throw new ForbiddenException("Your Slack email is not set in profile settings");
    if (!target.slackEmail) throw new ForbiddenException("Target user Slack email is not set");

    const sourceSlackId = await this.resolveSlackIdByEmail(secrets.botToken, source.slackEmail);
    const targetSlackId = await this.resolveSlackIdByEmail(secrets.botToken, target.slackEmail);

    const dm = await this.slackFetch("conversations.open", secrets.botToken, { users: `${sourceSlackId},${targetSlackId}` });

    return ok(
      {
        channelId: dm.channel?.id,
        targetUser: { id: target.id, email: target.email, slackEmail: target.slackEmail },
      },
      "Direct message opened",
    );
  }

  async listConversations(currentUser: AuthenticatedUser) {
    this.touchPresence(currentUser.sub);
    const secrets = await this.getSlackSecrets();
    const source = await this.userRepository.findOne({ where: { id: currentUser.sub } });
    if (!source?.slackEmail) throw new ForbiddenException("Your Slack email is not set in profile settings");

    const sourceSlackId = await this.resolveSlackIdByEmail(secrets.botToken, source.slackEmail);
    const result = await this.slackFetch("users.conversations", secrets.botToken, {
      user: sourceSlackId,
      types: "im,mpim,private_channel,public_channel",
      limit: 200,
    });

    const receipts = await this.slackReadReceiptRepository.find({ where: { userId: currentUser.sub } });
    const receiptMap = new Map(receipts.map((r) => [r.channelId, r.lastReadTs]));

    const conversations = (result.channels ?? []).map((c: any) => ({
      id: c.id,
      name: c.name || c.user || c.id,
      isIm: Boolean(c.is_im),
      isGroup: Boolean(c.is_group || c.is_private),
      isChannel: Boolean(c.is_channel),
      isMpim: Boolean(c.is_mpim),
      unreadCount: c.unread_count_display ?? c.unread_count ?? 0,
      lastReadTs: receiptMap.get(c.id) ?? null,
    }));

    return ok(conversations, "Slack conversations fetched");
  }

  async getMessages(currentUser: AuthenticatedUser, channelId: string) {
    this.touchPresence(currentUser.sub);
    const secrets = await this.getSlackSecrets();
    const result = await this.slackFetch("conversations.history", secrets.botToken, { channel: channelId, limit: 200 });

    const messages = (result.messages ?? []).map((m: any) => ({
      ts: m.ts,
      text: m.text,
      user: m.user,
      threadTs: m.thread_ts ?? null,
      replyCount: m.reply_count ?? 0,
      subtype: m.subtype ?? null,
      mentioned: Array.isArray(m.blocks) ? m.blocks : null,
    }));

    return ok(messages, "Slack messages fetched");
  }

  async getMessagesForStream(currentUser: AuthenticatedUser, channelId: string) {
    const response = await this.getMessages(currentUser, channelId);
    const receipts = await this.slackReadReceiptRepository.find({ where: { channelId } });
    return {
      messages: response.data,
      typingUsers: this.getTypingUsers(channelId),
      onlineUsers: this.getOnlineUsers(),
      readReceipts: receipts.map((r) => ({ userId: r.userId, lastReadTs: r.lastReadTs, updatedAt: r.updatedAt })),
    };
  }

  async sendMessage(currentUser: AuthenticatedUser, channelId: string, text: string, threadTs?: string) {
    this.touchPresence(currentUser.sub);
    const secrets = await this.getSlackSecrets();
    const result = await this.slackFetch("chat.postMessage", secrets.botToken, {
      channel: channelId,
      text,
      ...(threadTs ? { thread_ts: threadTs } : {}),
    });

    return ok(
      {
        channel: result.channel,
        ts: result.ts,
        message: result.message,
      },
      threadTs ? "Thread reply sent" : "Message sent",
    );
  }

  async uploadFile(currentUser: AuthenticatedUser, channelId: string, file: Express.Multer.File, text?: string, threadTs?: string) {
    this.touchPresence(currentUser.sub);
    const secrets = await this.getSlackSecrets();

    const upload = await this.slackFetch("files.getUploadURLExternal", secrets.botToken, {
      filename: file.originalname,
      length: file.size,
    });

    const uploadRes = await fetch(upload.upload_url, {
      method: "POST",
      headers: {
        "Content-Type": file.mimetype || "application/octet-stream",
      },
      body: new Uint8Array(file.buffer),
    });

    if (!uploadRes.ok) {
      throw new ForbiddenException("Failed to upload file content to Slack");
    }

    const complete = await this.slackFetch("files.completeUploadExternal", secrets.botToken, {
      files: [{ id: upload.file_id, title: file.originalname }],
      channel_id: channelId,
      ...(text ? { initial_comment: text } : {}),
      ...(threadTs ? { thread_ts: threadTs } : {}),
    });

    return ok({ file: complete.files?.[0] ?? null }, "File uploaded to Slack");
  }

  async getThreadReplies(currentUser: AuthenticatedUser, channelId: string, threadTs: string) {
    this.touchPresence(currentUser.sub);
    const secrets = await this.getSlackSecrets();
    const result = await this.slackFetch("conversations.replies", secrets.botToken, { channel: channelId, ts: threadTs, limit: 200 });

    const messages = (result.messages ?? []).map((m: any) => ({
      ts: m.ts,
      text: m.text,
      user: m.user,
      threadTs: m.thread_ts ?? null,
    }));

    return ok(messages, "Thread replies fetched");
  }

  async createChannelFromDepartment(currentUser: AuthenticatedUser, departmentId: string, isPrivate = true, prefix = "dept") {
    if (currentUser.role !== UserRole.SUPER_ADMIN && currentUser.role !== UserRole.HR_MANAGER) {
      throw new ForbiddenException("Only Super Admin and HR Manager can create department channels");
    }

    const secrets = await this.getSlackSecrets();
    const department = await this.departmentRepository.findOne({ where: { id: departmentId } });
    if (!department) throw new NotFoundException("Department not found");

    const name = this.slugify(`${prefix}-${department.name}-${Date.now().toString().slice(-5)}`);
    const created = await this.slackFetch("conversations.create", secrets.botToken, {
      name,
      is_private: isPrivate,
    });

    const employees = await this.employeeRepository.find({
      where: { departmentId },
      relations: { user: true },
    });

    const slackUserIds: string[] = [];
    for (const employee of employees) {
      const email = employee.user?.slackEmail;
      if (!email) continue;
      try {
        const id = await this.resolveSlackIdByEmail(secrets.botToken, email);
        slackUserIds.push(id);
      } catch {
        // skip unresolved slack mapping
      }
    }

    if (slackUserIds.length) {
      await this.slackFetch("conversations.invite", secrets.botToken, {
        channel: created.channel?.id,
        users: slackUserIds.join(","),
      });
    }

    return ok(
      {
        channelId: created.channel?.id,
        channelName: created.channel?.name,
        invitedCount: slackUserIds.length,
      },
      "Department channel created",
    );
  }
}
