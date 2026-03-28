import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailVerifiedToUser1774088227961 implements MigrationInterface {
    name = 'AddEmailVerifiedToUser1774088227961'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`emailVerified\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`emailVerified\``);
    }

}
