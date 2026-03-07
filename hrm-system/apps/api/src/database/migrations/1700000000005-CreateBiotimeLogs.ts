import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBiotimeLogs1700000000005 implements MigrationInterface {
  name = "CreateBiotimeLogs1700000000005";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "biotime_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "dedupeKey" character varying(191) NOT NULL,
        "externalLogId" character varying,
        "employeeCode" character varying NOT NULL,
        "employeeId" uuid,
        "day" date NOT NULL,
        "punchTime" TIMESTAMP WITH TIME ZONE NOT NULL,
        "punchState" character varying NOT NULL,
        "device" character varying,
        "source" character varying NOT NULL DEFAULT 'biotime_bridge',
        "rawPayload" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_biotime_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_biotime_logs_dedupe_key" ON "biotime_logs" ("dedupeKey")`);
    await queryRunner.query(`CREATE INDEX "IDX_biotime_logs_day" ON "biotime_logs" ("day")`);
    await queryRunner.query(`CREATE INDEX "IDX_biotime_logs_employee_day" ON "biotime_logs" ("employeeId", "day")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_biotime_logs_employee_day"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_biotime_logs_day"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_biotime_logs_dedupe_key"`);
    await queryRunner.query(`DROP TABLE "biotime_logs"`);
  }
}
