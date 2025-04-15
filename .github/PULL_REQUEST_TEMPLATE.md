# Migration from TypeORM to Prisma

## Description
This PR migrates the Order Service from TypeORM to Prisma ORM for better type safety and developer experience.

## Changes
- Added Prisma schema based on existing TypeORM entity
- Installed Prisma dependencies
- Created PrismaService and PrismaModule
- Updated OrdersService to use Prisma client
- Removed TypeORM dependencies and configuration
- Updated README with Prisma instructions
- Added migration scripts for database management

## How to test
1. Run `npm install` to install new dependencies
2. Set up environment variables in `.env`
3. Run `npx prisma generate` to generate the Prisma client
4. Run `npx prisma migrate dev` to apply migrations
5. Start the application with `npm run start:dev`
6. Verify that the API endpoints still work as expected

## Additional notes
- Make sure to check the `.env` file for database connection string
- The Prisma schema is in `prisma/schema.prisma` 