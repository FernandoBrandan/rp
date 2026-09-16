import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { envSchema } from './env.validation';

const env = process.env.NODE_ENV || 'dev';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${env}`, '.env'],
      validationSchema: envSchema,
      validationOptions: {
        abortEarly: false,
      },
      expandVariables: true,
    }),
  ],
})
export class ConfigModule {}
