#!/bin/bash

# Generate Prisma client
npx prisma generate

# Run migrations in production
npx prisma migrate deploy

# Start the application
npm run start:prod 