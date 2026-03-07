import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

@Entity("slack_read_receipts")
@Unique("UQ_slack_read_receipts_user_channel", ["userId", "channelId"])
export class SlackReadReceipt {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "varchar" })
  channelId!: string;

  @Column({ type: "varchar", nullable: true })
  lastReadTs!: string | null;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
