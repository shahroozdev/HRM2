import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AttendanceStatus } from "../../common/types/enums";
import { Employee } from "./employee.entity";

@Entity("attendance")
export class Attendance {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  employeeId!: string;

  @Column({ type: "varchar", nullable: true, unique: true })
  biotimeTransactionId!: string | null;

  @ManyToOne(() => Employee, (employee) => employee.attendances, { onDelete: "CASCADE" })
  @JoinColumn({ name: "employeeId" })
  employee!: Employee;

  @Column({ type: "date" })
  date!: string;

  @Column({ type: "timestamptz", nullable: true })
  checkIn!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  checkOut!: Date | null;

  @Column({ type: "enum", enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  status!: AttendanceStatus;

  @Column({ type: "int", default: 0 })
  overtimeMinutes!: number;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ type: "varchar", default: "manual" })
  source!: string;

  @Column({ type: "jsonb", nullable: true })
  rawPayload!: Record<string, unknown> | null;
}
