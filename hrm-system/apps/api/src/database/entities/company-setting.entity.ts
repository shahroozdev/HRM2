import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("company_settings")
export class CompanySetting {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  key!: string;

  @Column({ type: "jsonb" })
  value!: Record<string, unknown>;
}
