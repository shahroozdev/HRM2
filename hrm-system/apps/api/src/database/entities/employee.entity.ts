import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { EmployeeStatus, EmploymentType } from "../../common/types/enums";
import { User } from "./user.entity";
import { Department } from "./department.entity";
import { Designation } from "./designation.entity";
import { Attendance } from "./attendance.entity";
import { LeaveRequest } from "./leave-request.entity";
import { SalaryStructure } from "./salary-structure.entity";
import { Payroll } from "./payroll.entity";
import { Document } from "./document.entity";

@Entity("employees")
export class Employee {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  employeeId!: string;

  @Column({ type: "varchar", nullable: true, unique: true })
  biometricCode!: string | null;

  @Column({ unique: true })
  userId!: string;

  @OneToOne(() => User, (user) => user.employee, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ type: "varchar", nullable: true })
  avatar!: string | null;

  @Column({ type: "varchar", nullable: true })
  phone!: string | null;

  @Column({ type: "varchar", nullable: true })
  address!: string | null;

  @Column({ type: "varchar", nullable: true })
  cnic!: string | null;

  @Column({ type: "jsonb", nullable: true })
  emergencyContact!: Record<string, unknown> | null;

  @Column({ type: "uuid", nullable: true })
  departmentId!: string | null;

  @ManyToOne(() => Department, (department) => department.employees, { onDelete: "SET NULL" })
  @JoinColumn({ name: "departmentId" })
  department!: Department | null;

  @Column({ type: "uuid", nullable: true })
  designationId!: string | null;

  @ManyToOne(() => Designation, (designation) => designation.employees, { onDelete: "SET NULL" })
  @JoinColumn({ name: "designationId" })
  designation!: Designation | null;

  @Column({ type: "uuid", nullable: true })
  reportingManagerId!: string | null;

  @ManyToOne(() => Employee, (employee) => employee.teamMembers, { onDelete: "SET NULL" })
  @JoinColumn({ name: "reportingManagerId" })
  reportingManager!: Employee | null;

  @OneToMany(() => Employee, (employee) => employee.reportingManager)
  teamMembers!: Employee[];

  @Column({ type: "date" })
  joinDate!: string;

  @Column({ type: "enum", enum: EmploymentType, default: EmploymentType.FULL_TIME })
  employmentType!: EmploymentType;

  @Column({ type: "varchar", nullable: true })
  workLocation!: string | null;

  @Column({ type: "enum", enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  status!: EmployeeStatus;

  @OneToMany(() => Attendance, (attendance) => attendance.employee)
  attendances!: Attendance[];

  @OneToMany(() => LeaveRequest, (leaveRequest) => leaveRequest.employee)
  leaveRequests!: LeaveRequest[];

  @OneToMany(() => LeaveRequest, (leaveRequest) => leaveRequest.reviewer)
  reviewedLeaves!: LeaveRequest[];

  @OneToOne(() => SalaryStructure, (salaryStructure) => salaryStructure.employee)
  salaryStructure!: SalaryStructure;

  @OneToMany(() => Payroll, (payroll) => payroll.employee)
  payrolls!: Payroll[];

  @OneToMany(() => Document, (document) => document.employee)
  documents!: Document[];
}
