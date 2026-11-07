import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1789591925931 implements MigrationInterface {
  name = 'Init1789591925931';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Extensiones ────────────────────────────────────────────────
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ── users (UserEntity) ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" character varying NOT NULL,
        "email" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "role" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    // ── products (ProductEntity) ───────────────────────────────────
    // price: la entidad usa decimal(12,2), la migración original decía double precision.
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" character varying NOT NULL,
        "serial" character varying NOT NULL,
        "name" character varying NOT NULL,
        "price" numeric(12,2) NOT NULL,
        "stock" integer NOT NULL DEFAULT 0,
        "status" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_products_serial" UNIQUE ("serial"),
        CONSTRAINT "PK_products_id" PRIMARY KEY ("id")
      )
    `);

    // ── stock_reservations (StockReservationEntity) ────────────────
    await queryRunner.query(
      `CREATE TYPE "public"."stock_reservations_status_enum" AS ENUM('RESERVED', 'CONFIRMED', 'RELEASED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "stock_reservations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orderId" character varying NOT NULL,
        "items" json NOT NULL,
        "status" "public"."stock_reservations_status_enum" NOT NULL DEFAULT 'RESERVED',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_reservations_id" PRIMARY KEY ("id")
      )
    `);

    // ── carts (CartOrmEntity) ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "carts" (
        "userId" character varying NOT NULL,
        "items" json NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_carts_userId" PRIMARY KEY ("userId")
      )
    `);

    // ── orders (OrderEntity) — faltaba currency + índice ──────────
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" character varying NOT NULL,
        "userId" character varying NOT NULL,
        "idempotencyKey" character varying NOT NULL,
        "items" json NOT NULL,
        "total" double precision NOT NULL,
        "currency" character varying(3) NOT NULL,
        "status" character varying NOT NULL,
        "reservationId" character varying NOT NULL,
        "paymentStatus" character varying NOT NULL DEFAULT 'PENDING',
        "paymentUrl" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_orders_idempotencyKey" UNIQUE ("idempotencyKey"),
        CONSTRAINT "PK_orders_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_orders_status_updatedAt" ON "orders" ("status", "updatedAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_orders_status_updatedAt"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TABLE "carts"`);
    await queryRunner.query(`DROP TABLE "stock_reservations"`);
    await queryRunner.query(`DROP TYPE "public"."stock_reservations_status_enum"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
