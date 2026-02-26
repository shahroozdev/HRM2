import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Employee } from "./employee.entity";
import { Designation } from "./designation.entity";

@Entity("departments")
export class Department {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "uuid", nullable: true })
  headId!: string | null;

  @ManyToOne(() => Employee, { onDelete: "SET NULL" })
  head!: Employee | null;

  @OneToMany(() => Employee, (employee) => employee.department)
  employees!: Employee[];

  @OneToMany(() => Designation, (designation) => designation.department)
  designations!: Designation[];
}
