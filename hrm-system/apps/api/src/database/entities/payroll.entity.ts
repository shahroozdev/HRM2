import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PayrollStatus } from "../../common/types/enums";
import { Employee } from "./employee.entity";

@Entity("payrolls")
export class Payroll {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  employeeId!: string;

  @ManyToOne(() => Employee, (employee) => employee.payrolls, { onDelete: "CASCADE" })
  @JoinColumn({ name: "employeeId" })
  employee!: Employee;

  @Column({ type: "int" })
  month!: number;

  @Column({ type: "int" })
  year!: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  basicSalary!: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  totalAllowances!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  overtimePay!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  bonus!: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  grossSalary!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  taxDeduction!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  leaveDeductions!: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  netSalary!: number;

  @Column({ type: "enum", enum: PayrollStatus, default: PayrollStatus.DRAFT })
  status!: PayrollStatus;
}
