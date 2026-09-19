import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'crypto';

import { AppModule } from '@main/app.module';

import { Product } from '@catalog/domain/product.entity';
import { Serial } from '@catalog/domain/value-objects/serial.vo';
import { Money } from '@common/domain/value-objects/money.vo';
import { ProductStatus } from '@catalog/domain/enums/productStatus.enum';
import { ProductRepository } from '@catalog/domain/repositories/product.repository';

import { User } from '@user/domain/user.entity';
import { Email } from '@user/domain/value-objects/email.vo';
import { UserRepository } from '@user/domain/repositories/user.repository';

import { UserRole } from '@common/user-role.enum';
import {
  PRODUCT_REPOSITORY,
  USER_REPOSITORY,
  HASH_SERVICE,
} from '@infra/tokens';
import { HashService } from '@infra/auth-infra/ports/hash.service';

interface SeedProduct {
  serial: string;
  name: string;
  price: number;
  stock: number;
}

const DEV_PRODUCTS: SeedProduct[] = [
  { serial: 'PROD-000001', name: 'Laptop Gamer', price: 1500.0, stock: 10 },
  { serial: 'PROD-000002', name: 'Mouse Inalámbrico', price: 35.5, stock: 50 },
  { serial: 'PROD-000003', name: 'Teclado Mecánico', price: 85.5, stock: 30 },
];

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin1234!';

async function seedProducts(repo: ProductRepository) {
  let created = 0;
  let skipped = 0;

  for (const p of DEV_PRODUCTS) {
    const existing = await repo.findBySerial(p.serial);
    if (existing) {
      console.log(`   ⏭  ${p.serial} ya existe — skip`);
      skipped++;
      continue;
    }

    const product = new Product(
      randomUUID(),
      new Serial(p.serial),
      p.name,
      new Money(p.price),
      p.stock,
      ProductStatus.ACTIVE,
    );

    await repo.save(product);
    console.log(`   ✔  ${p.serial} (${p.name}) creado`);
    created++;
  }

  return { created, skipped };
}

async function seedAdmin(repo: UserRepository, hashService: HashService) {
  const existing = await repo.findByEmail(new Email(ADMIN_EMAIL));
  if (existing) {
    console.log(`   ⏭  ${ADMIN_EMAIL} ya existe — skip`);
    return false;
  }

  const passwordHash = await hashService.hash(ADMIN_PASSWORD);
  const admin = new User(
    randomUUID(),
    new Email(ADMIN_EMAIL),
    passwordHash,
    UserRole.ADMIN,
  );

  await repo.save(admin);
  console.log(`   ✔  ${ADMIN_EMAIL} (ADMIN) creado`);
  return true;
}

async function main() {
  if (
    process.env.NODE_ENV === 'prod' &&
    process.env.ALLOW_PROD_SEED !== 'true'
  ) {
    console.error(
      '❌ Seed bloqueado en prod.\n' +
        '   Si es un admin inicial y sabés lo que hacés: ALLOW_PROD_SEED=true',
    );
    process.exit(1);
  }

  console.log('🌱 Seed iniciando...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const productRepo = app.get<ProductRepository>(PRODUCT_REPOSITORY);
    const userRepo = app.get<UserRepository>(USER_REPOSITORY);
    const hashService = app.get<HashService>(HASH_SERVICE);

    console.log('👤 Usuarios:');
    const adminCreated = await seedAdmin(userRepo, hashService);

    console.log('\n📦 Productos:');
    const { created, skipped } = await seedProducts(productRepo);

    console.log(
      `\n🎉 Listo: ${adminCreated ? 1 : 0} admin, ${created} productos creados, ${skipped} productos ya existían.`,
    );

    if (adminCreated) {
      console.log(`\n🔑 Admin:`);
      console.log(`   email:    ${ADMIN_EMAIL}`);
      console.log(`   password: ${ADMIN_PASSWORD}`);
      console.log(`   ⚠️  Cambiá la password en producción.`);
    }
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('❌ Seed falló:', err);
  process.exit(1);
});
