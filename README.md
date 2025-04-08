# Order Service

This is the Order Service for the e-commerce platform. It handles order creation, management, and tracking.

## Features

- Create and manage orders
- Track order status
- Integrate with Product Service for product validation
- Swagger API documentation
- PostgreSQL database with migrations
- JWT authentication

## Prerequisites

- Node.js (v16 or later)
- PostgreSQL (v12 or later)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd order-service
```

2. Install dependencies:
```bash
npm install
```

3. Create a PostgreSQL database:
```sql
CREATE DATABASE order_service_db;
```

4. Configure environment variables:
   - Copy the `.env.example` file to `.env`
   - Update the database connection details and other configuration as needed

## Running the Application

### Development Mode

```bash
npm run start:dev
```

### Production Mode

```bash
npm run build
npm run start:prod
```

## Database Migrations

### Generate a Migration

```bash
npm run migration:generate -- src/migrations/MigrationName
```

### Run Migrations

```bash
npm run migration:run
```

### Revert Migrations

```bash
npm run migration:revert
```

## API Documentation

The API documentation is available at `/api` when the application is running.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | The port the application will listen on | 3000 |
| NODE_ENV | The environment (development, production) | development |
| DB_HOST | PostgreSQL host | localhost |
| DB_PORT | PostgreSQL port | 5432 |
| DB_USERNAME | PostgreSQL username | postgres |
| DB_PASSWORD | PostgreSQL password | postgres |
| DB_DATABASE | PostgreSQL database name | order_service_db |
| JWT_SECRET | Secret key for JWT tokens | your_jwt_secret_key |
| JWT_EXPIRATION | JWT token expiration time | 1d |
| PRODUCT_SERVICE_URL | URL of the Product Service | http://localhost:3001 |
| USER_SERVICE_URL | URL of the User Service | http://localhost:3002 |

## API Endpoints

### Orders

- `POST /orders` - Create a new order
- `GET /orders` - Get all orders (admin only)
- `GET /orders/my-orders` - Get user's orders
- `GET /orders/:id` - Get a specific order
- `PATCH /orders/:id/status` - Update order status (admin only)
- `DELETE /orders/:id` - Cancel an order

## License

This project is licensed under the MIT License.
