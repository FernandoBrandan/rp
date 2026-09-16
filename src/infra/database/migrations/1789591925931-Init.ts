import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1789591925931 implements MigrationInterface {
    name = 'Init1789591925931'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "products" ("id" character varying NOT NULL, "serial" character varying NOT NULL, "name" character varying NOT NULL, "price" double precision NOT NULL, "stock" integer NOT NULL DEFAULT '0', "status" character varying NOT NULL, CONSTRAINT "UQ_54fb333f7f4c48d6905a586bc23" UNIQUE ("serial"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."stock_reservations_status_enum" AS ENUM('RESERVED', 'CONFIRMED', 'RELEASED')`);
        await queryRunner.query(`CREATE TABLE "stock_reservations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" character varying NOT NULL, "items" json NOT NULL, "status" "public"."stock_reservations_status_enum" NOT NULL DEFAULT 'RESERVED', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_46ec0f5605d70f64654ad4e7bd9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "carts" ("userId" character varying NOT NULL, "items" json NOT NULL, CONSTRAINT "PK_69828a178f152f157dcf2f70a89" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" character varying NOT NULL, "userId" character varying NOT NULL, "idempotencyKey" character varying NOT NULL, "items" json NOT NULL, "total" double precision NOT NULL, "status" character varying NOT NULL, "reservationId" character varying NOT NULL, "paymentStatus" character varying NOT NULL DEFAULT 'PENDING', "paymentUrl" character varying, CONSTRAINT "UQ_1881ab845832ad82c4e45f5fe3b" UNIQUE ("idempotencyKey"), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TABLE "carts"`);
        await queryRunner.query(`DROP TABLE "stock_reservations"`);
        await queryRunner.query(`DROP TYPE "public"."stock_reservations_status_enum"`);
        await queryRunner.query(`DROP TABLE "products"`);
    }

}
