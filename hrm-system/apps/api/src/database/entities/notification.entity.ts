import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.notifications, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column()
  title!: string;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "varchar", nullable: true })
  type!: string | null;

  @Column({ default: false })
  isRead!: boolean;

  @Column({ type: "varchar", nullable: true })
  link!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
