import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTrackingNumberColumn1710000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add trackingNumber column to orders table
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'trackingNumber',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove trackingNumber column from orders table
    await queryRunner.dropColumn('orders', 'trackingNumber');
  }
} 