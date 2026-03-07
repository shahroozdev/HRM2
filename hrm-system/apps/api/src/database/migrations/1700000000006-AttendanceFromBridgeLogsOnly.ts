import { MigrationInterface, QueryRunner } from "typeorm";

export class AttendanceFromBridgeLogsOnly1700000000006 implements MigrationInterface {
  name = "AttendanceFromBridgeLogsOnly1700000000006";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "attendance" a
      USING "attendance" b
      WHERE a.id < b.id
        AND a."employeeId" = b."employeeId"
        AND a."date" = b."date"
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_attendance_employee_date_unique" ON "attendance" ("employeeId", "date")`);
    await queryRunner.query(`DROP TABLE IF EXISTS "biotime_logs"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_employee_date_unique"`);
  }
}
