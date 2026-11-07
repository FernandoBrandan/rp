// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

import { AppLogger } from '@infra/logger/logger';
import { correlationIdMiddleware } from '@infra/logger/correlation-id.middleware';
import { AllExceptionsFilter } from '@common/domain/errors/all-exceptions.filter';
import { InfrastructureExceptionFilter } from '@common/filters/infrastructure-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Config
  app.enableShutdownHooks();
  app.use(correlationIdMiddleware);
  // app.useGlobalFilters(new AllExceptionsFilter(new AppLogger()));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalFilters(new InfrastructureExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // src/main.ts
  app.enableCors({
    origin: true, // refleja el Origin del request
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    exposedHeaders: ['x-correlation-id'],
    credentials: false,
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('E-commerce API')
    .setDescription('API de catálogo, carrito, órdenes y pagos. Flujo event-driven con idempotencia.')
    .setVersion('1.0')
    .addTag('health', 'Estado del servicio')
    .addTag('auth', 'Autenticación')
    .addTag('users', 'Perfiles de usuario')
    .addTag('products', 'Gestión de catálogo')
    .addTag('cart', 'Carrito de compras')
    .addTag('orders', 'Órdenes e idempotencia')
    .addTag('payments', 'Webhooks y proveedores de pago')
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
