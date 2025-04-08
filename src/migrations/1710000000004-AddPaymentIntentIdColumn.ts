import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPaymentIntentIdColumn1710000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add paymentIntentId column to orders table
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'paymentIntentId',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove paymentIntentId column from orders table
    await queryRunner.dropColumn('orders', 'paymentIntentId');
  }
} 