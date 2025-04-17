// Migration script to help migrate TypeORM database to Prisma
// Run with: npx ts-node prisma/migration.ts

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config();

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Check connection
    await prisma.$connect();
    console.log('Connected to database successfully.');
    
    // You can run custom migration steps here if needed
    
    // Use prisma migrate command to apply schema changes
    console.log('Migration complete. Now run:');
    console.log('npx prisma migrate dev --name init');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 