import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { envSchema } from './env.validation';

const env = process.env.NODE_ENV || 'dev';
const envFile = env === 'dev' ? '.env.dev' : '.env.docker';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFile,
      validationSchema: envSchema,
      validationOptions: {
        abortEarly: false,
      },
      expandVariables: true,
    }),
  ],
})
export class ConfigModule {}
