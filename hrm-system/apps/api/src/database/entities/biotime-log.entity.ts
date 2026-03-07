import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("biotime_logs")
export class BiotimeLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index("IDX_biotime_logs_dedupe_key", { unique: true })
  @Column({ type: "varchar", length: 191 })
  dedupeKey!: string;

  @Column({ type: "varchar", nullable: true })
  externalLogId!: string | null;

  @Column({ type: "varchar" })
  employeeCode!: string;

  @Column({ type: "uuid", nullable: true })
  employeeId!: string | null;

  @Index("IDX_biotime_logs_day")
  @Column({ type: "date" })
  day!: string;

  @Column({ type: "timestamptz" })
  punchTime!: Date;

  @Column({ type: "varchar" })
  punchState!: string;

  @Column({ type: "varchar", nullable: true })
  device!: string | null;

  @Column({ type: "varchar", default: "biotime_bridge" })
  source!: string;

  @Column({ type: "jsonb", nullable: true })
  rawPayload!: Record<string, unknown> | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
