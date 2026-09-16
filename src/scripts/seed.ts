// REVISAR
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'crypto';

import { AppModule } from '../app.module';
import { Product } from '@catalog/domain/product.entity';
import { Serial } from '@catalog/domain/value-objects/serial.vo';
import { Money } from '@common/domain/value-objects/money.vo';
import { ProductStatus } from '@catalog/domain/enums/productStatus.enum';
import { ProductRepository } from '@catalog/domain/repositories/product.repository';
import { PRODUCT_REPOSITORY } from '@infra/tokens';

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

async function main() {
  // Guardia: nunca seedear prod sin permiso explícito
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

  // createApplicationContext → levanta solo el container DI (sin HTTP)
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const productRepo = app.get<ProductRepository>(PRODUCT_REPOSITORY);

    console.log('📦 Productos:');
    const { created, skipped } = await seedProducts(productRepo);

    console.log(`\n🎉 Listo: ${created} creados, ${skipped} ya existían.`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('❌ Seed falló:', err);
  process.exit(1);
});
