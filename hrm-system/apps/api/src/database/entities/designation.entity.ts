import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Department } from "./department.entity";
import { Employee } from "./employee.entity";

@Entity("designations")
export class Designation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column()
  departmentId!: string;

  @ManyToOne(() => Department, (department) => department.designations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "departmentId" })
  department!: Department;

  @OneToMany(() => Employee, (employee) => employee.designation)
  employees!: Employee[];
}
