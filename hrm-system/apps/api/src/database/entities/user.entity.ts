import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { UserRole } from "../../common/types/enums";
import { Employee } from "./employee.entity";
import { Notification } from "./notification.entity";
import { Document } from "./document.entity";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ type: "enum", enum: UserRole, default: UserRole.EMPLOYEE })
  role!: UserRole;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: "varchar", nullable: true })
  resetToken!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  resetTokenExpiresAt!: Date | null;

  @Column({ type: "varchar", nullable: true })
  slackEmail!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @OneToOne(() => Employee, (employee) => employee.user)
  employee!: Employee;

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications!: Notification[];

  @OneToMany(() => Document, (document) => document.uploadedBy)
  uploadedDocuments!: Document[];
}
