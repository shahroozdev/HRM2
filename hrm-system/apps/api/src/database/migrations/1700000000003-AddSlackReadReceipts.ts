import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSlackReadReceipts1700000000003 implements MigrationInterface {
  name = "AddSlackReadReceipts1700000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "slack_read_receipts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "channelId" character varying NOT NULL,
        "lastReadTs" character varying,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_slack_read_receipts_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_slack_read_receipts_user_channel"
      ON "slack_read_receipts" ("userId", "channelId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_slack_read_receipts_user_channel"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "slack_read_receipts"`);
  }
}
