// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppLogger } from '@infra/logger/logger';
import { correlationIdMiddleware } from '@infra/logger/correlation-id.middleware';
import { AllExceptionsFilter } from '@infra/errors/all-exceptions.filter';
import { InfrastructureExceptionFilter } from '@common/filters/infrastructure-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Config
  app.use(correlationIdMiddleware);
  app.useGlobalFilters(new AllExceptionsFilter(new AppLogger()));
  app.useGlobalFilters(new InfrastructureExceptionFilter());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('API de Mi Proyecto')
    .setDescription('Documentación de la API con Swagger')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start the server
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
