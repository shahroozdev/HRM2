import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSlackEmailAndSecureSettings1700000000002 implements MigrationInterface {
  name = "AddSlackEmailAndSecureSettings1700000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "slackEmail" character varying`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_slack_email" ON "users" ("slackEmail") WHERE "slackEmail" IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_slack_email"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "slackEmail"`);
  }
}
