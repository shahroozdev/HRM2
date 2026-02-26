import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Employee } from "./employee.entity";

@Entity("salary_structures")
export class SalaryStructure {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  employeeId!: string;

  @OneToOne(() => Employee, (employee) => employee.salaryStructure, { onDelete: "CASCADE" })
  @JoinColumn({ name: "employeeId" })
  employee!: Employee;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  basicSalary!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  houseAllowance!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  medicalAllowance!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  transportAllowance!: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  taxRate!: number;
}
