import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBiotimeSyncFields1700000000004 implements MigrationInterface {
  name = "AddBiotimeSyncFields1700000000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "employees" ADD COLUMN "biometricCode" character varying`);
    await queryRunner.query(`ALTER TABLE "attendance" ADD COLUMN "biotimeTransactionId" character varying`);
    await queryRunner.query(`ALTER TABLE "attendance" ADD COLUMN "source" character varying NOT NULL DEFAULT 'manual'`);
    await queryRunner.query(`ALTER TABLE "attendance" ADD COLUMN "rawPayload" jsonb`);

    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_employees_biometricCode" ON "employees" ("biometricCode") WHERE "biometricCode" IS NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_attendance_biotimeTransactionId" ON "attendance" ("biotimeTransactionId") WHERE "biotimeTransactionId" IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_attendance_source" ON "attendance" ("source")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_attendance_source"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_attendance_biotimeTransactionId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_employees_biometricCode"`);

    await queryRunner.query(`ALTER TABLE "attendance" DROP COLUMN "rawPayload"`);
    await queryRunner.query(`ALTER TABLE "attendance" DROP COLUMN "source"`);
    await queryRunner.query(`ALTER TABLE "attendance" DROP COLUMN "biotimeTransactionId"`);
    await queryRunner.query(`ALTER TABLE "employees" DROP COLUMN "biometricCode"`);
  }
}
