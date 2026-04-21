// import { PrismaClient } from '@prisma/client';

// import { Product } from '../../domain/product.entity';
// import { Money } from '../../domain/value-objects/money.vo';
// import { ProductStatus } from '../../domain/value-objects/productStatus.vo';
// import { ProductRepository } from '../../domain/repositories/product.repository';

// export class PrismaProductRepository implements ProductRepository {
//   constructor(private prisma: PrismaClient) {}

//   async save(product: Product): Promise<void> {
//     await this.prisma.product.upsert({
//       where: { id: product.id },
//       update: {
//         name: product.name,
//         price: product.price.getValue(),
//         stock: product.stock,
//         status: product.status.getValue(),
//       },
//       create: {
//         id: product.id,
//         name: product.name,
//         price: product.price.getValue(),
//         stock: product.stock,
//         status: product.status.getValue(),
//       },
//     });
//   }

//   async findById(id: string): Promise<Product | null> {
//     const p = await this.prisma.product.findUnique({ where: { id } });
//     if (!p) return null;

//     return new Product(
//       p.id,
//       p.name,
//       new Money(p.price),
//       p.stock,
//       p.status === 'ACTIVE' ? ProductStatus.ACTIVE : ProductStatus.INACTIVE,
//     );
//   }

//   async findAll(): Promise<Product[]> {
//     const products = await this.prisma.product.findMany();

//     return products.map(
//       (p) =>
//         new Product(
//           p.id,
//           p.name,
//           new Money(p.price),
//           p.stock,
//           p.status === 'ACTIVE' ? ProductStatus.ACTIVE : ProductStatus.INACTIVE,
//         ),
//     );
//   }
// }
