import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class FixTrackingNumberColumn1710000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First drop the old column if it exists
    try {
      await queryRunner.dropColumn('orders', 'tracking_number');
    } catch (error) {
      // Column might not exist, which is fine
      console.log('Column tracking_number does not exist, skipping drop');
    }

    // Add the new column with the correct name
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
    // Remove the new column
    await queryRunner.dropColumn('orders', 'trackingNumber');

    // Add back the old column
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'tracking_number',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }
} 