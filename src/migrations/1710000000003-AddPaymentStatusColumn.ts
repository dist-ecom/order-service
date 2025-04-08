import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentStatusColumn1710000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the enum type
    await queryRunner.query(`
      CREATE TYPE "public"."orders_payment_status_enum" AS ENUM(
        'pending',
        'paid',
        'completed',
        'failed',
        'refunded'
      )
    `);

    // Add the paymentStatus column
    await queryRunner.query(`
      ALTER TABLE "orders" 
      ADD COLUMN "paymentStatus" "public"."orders_payment_status_enum" 
      NOT NULL DEFAULT 'pending'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the column
    await queryRunner.query(`
      ALTER TABLE "orders" 
      DROP COLUMN "paymentStatus"
    `);

    // Drop the enum type
    await queryRunner.query(`
      DROP TYPE "public"."orders_payment_status_enum"
    `);
  }
} 