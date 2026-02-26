import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { AuthenticatedUser } from "../../common/types/api.types";
import { UserRole } from "../../common/types/enums";
import { ok } from "../../common/utils/response.util";
import { Notification } from "../../database/entities";

@Injectable()
export class NotificationsService {
  constructor(@InjectRepository(Notification) private readonly notificationRepository: Repository<Notification>) {}

  async list(user: AuthenticatedUser) {
    const where = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.HR_MANAGER ? {} : { userId: user.sub };
    const rows = await this.notificationRepository.find({ where, order: { createdAt: "DESC" } });
    return ok(rows, "Notifications fetched", { total: rows.length });
  }

  async markRead(id: string, user: AuthenticatedUser) {
    const notification = await this.notificationRepository.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    if (
      notification.userId !== user.sub &&
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.HR_MANAGER
    ) {
      throw new ForbiddenException("No access");
    }

    notification.isRead = true;
    await this.notificationRepository.save(notification);
    return ok(notification, "Notification marked as read");
  }

  async readAll(user: AuthenticatedUser) {
    const targets =
      user.role === UserRole.SUPER_ADMIN || user.role === UserRole.HR_MANAGER
        ? await this.notificationRepository.find({ select: { id: true } })
        : await this.notificationRepository.find({ where: { userId: user.sub }, select: { id: true } });

    if (targets.length) {
      await this.notificationRepository.update({ id: In(targets.map((item) => item.id)) }, { isRead: true });
    }

    return ok({ updated: targets.length }, "Notifications marked as read");
  }
}
