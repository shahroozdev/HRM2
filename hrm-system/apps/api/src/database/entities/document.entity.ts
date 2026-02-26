import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { DocumentAccessLevel, DocumentType } from "../../common/types/enums";
import { Employee } from "./employee.entity";
import { User } from "./user.entity";

@Entity("documents")
export class Document {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  employeeId!: string;

  @ManyToOne(() => Employee, (employee) => employee.documents, { onDelete: "CASCADE" })
  @JoinColumn({ name: "employeeId" })
  employee!: Employee;

  @Column({ type: "enum", enum: DocumentType })
  type!: DocumentType;

  @Column()
  name!: string;

  @Column()
  filePath!: string;

  @Column()
  uploadedById!: string;

  @ManyToOne(() => User, (user) => user.uploadedDocuments, { onDelete: "CASCADE" })
  @JoinColumn({ name: "uploadedById" })
  uploadedBy!: User;

  @Column({ type: "enum", enum: DocumentAccessLevel, default: DocumentAccessLevel.EMPLOYEE })
  accessLevel!: DocumentAccessLevel;
}
