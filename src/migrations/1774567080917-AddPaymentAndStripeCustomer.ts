import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentAndStripeCustomer1774567080917 implements MigrationInterface {
    name = 'AddPaymentAndStripeCustomer1774567080917'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`payment\` (\`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT, \`userId\` bigint UNSIGNED NOT NULL, \`stripeSessionId\` varchar(255) NOT NULL, \`stripePaymentIntentId\` varchar(255) NULL, \`status\` varchar(50) NOT NULL, \`amount\` int UNSIGNED NOT NULL, \`currency\` varchar(10) NOT NULL DEFAULT 'jpy', \`description\` varchar(255) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_4f1a3ee2c5a576a7588bd4cf7e\` (\`stripeSessionId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`stripeCustomerId\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_0bfe583759eb0305b60117be84\` (\`stripeCustomerId\`)`);
        await queryRunner.query(`ALTER TABLE \`payment\` ADD CONSTRAINT \`FK_b046318e0b341a7f72110b75857\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`payment\` DROP FOREIGN KEY \`FK_b046318e0b341a7f72110b75857\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP INDEX \`IDX_0bfe583759eb0305b60117be84\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`stripeCustomerId\``);
        await queryRunner.query(`DROP INDEX \`IDX_4f1a3ee2c5a576a7588bd4cf7e\` ON \`payment\``);
        await queryRunner.query(`DROP TABLE \`payment\``);
    }

}
