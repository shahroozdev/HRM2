import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { LeaveRequestStatus } from "../../common/types/enums";
import { Employee } from "./employee.entity";
import { LeaveType } from "./leave-type.entity";

@Entity("leave_requests")
export class LeaveRequest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  employeeId!: string;

  @ManyToOne(() => Employee, (employee) => employee.leaveRequests, { onDelete: "CASCADE" })
  @JoinColumn({ name: "employeeId" })
  employee!: Employee;

  @Column()
  leaveTypeId!: string;

  @ManyToOne(() => LeaveType, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "leaveTypeId" })
  leaveType!: LeaveType;

  @Column({ type: "date" })
  startDate!: string;

  @Column({ type: "date" })
  endDate!: string;

  @Column({ type: "int" })
  totalDays!: number;

  @Column({ type: "text" })
  reason!: string;

  @Column({ type: "enum", enum: LeaveRequestStatus, default: LeaveRequestStatus.PENDING })
  status!: LeaveRequestStatus;

  @Column({ type: "uuid", nullable: true })
  reviewedBy!: string | null;

  @ManyToOne(() => Employee, (employee) => employee.reviewedLeaves, { onDelete: "SET NULL" })
  @JoinColumn({ name: "reviewedBy" })
  reviewer!: Employee | null;

  @Column({ type: "timestamptz", nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: "text", nullable: true })
  remarks!: string | null;
}
