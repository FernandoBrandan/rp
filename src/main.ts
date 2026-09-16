// src/main.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

import { AppLogger } from '@infra/logger/logger';
import { correlationIdMiddleware } from '@infra/logger/correlation-id.middleware';
import { AllExceptionsFilter } from '@infra/errors/all-exceptions.filter';
import { InfrastructureExceptionFilter } from '@common/filters/infrastructure-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Config
  app.enableShutdownHooks();
  app.use(correlationIdMiddleware);
  app.useGlobalFilters(new AllExceptionsFilter(new AppLogger()));
  app.useGlobalFilters(new InfrastructureExceptionFilter());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('E-commerce API')
    .setDescription(
      'API de catálogo, carrito, órdenes y pagos. Flujo event-driven con idempotencia.',
    )
    .setVersion('1.0')
    .addTag('products', 'Gestión de catálogo')
    .addTag('cart', 'Carrito de compras')
    .addTag('orders', 'Órdenes e idempotencia')
    .addTag('payments', 'Webhooks y proveedores de pago')
    .addTag('health', 'Estado del servicio')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
  });

  // Start the server
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
