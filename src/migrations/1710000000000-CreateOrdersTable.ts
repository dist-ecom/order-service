import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class CreateOrdersTable1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for order status
    await queryRunner.query(`
      CREATE TYPE order_status_enum AS ENUM (
        'pending', 'processing', 'shipped', 'delivered', 'cancelled'
      )
    `);

    // Create orders table
    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'items',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'total_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
            default: "'pending'",
          },
          {
            name: 'shipping_address',
            type: 'varchar',
          },
          {
            name: 'payment_method',
            type: 'varchar',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create order_items table
    await queryRunner.createTable(
      new Table({
        name: 'order_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'product_id',
            type: 'uuid',
          },
          {
            name: 'quantity',
            type: 'int',
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'order_id',
            type: 'uuid',
          },
        ],
      }),
      true,
    );

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE order_items
      ADD CONSTRAINT fk_order_items_order
      FOREIGN KEY (order_id)
      REFERENCES orders(id)
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE order_items
      DROP CONSTRAINT fk_order_items_order
    `);

    // Drop tables
    await queryRunner.dropTable('order_items');
    await queryRunner.dropTable('orders');

    // Drop enum type
    await queryRunner.query(`DROP TYPE order_status_enum`);
  }
} 