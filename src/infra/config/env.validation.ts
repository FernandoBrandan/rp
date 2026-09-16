import Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('dev', 'prod', 'test').default('dev'),
  PORT: Joi.number().default(3000),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_USER: Joi.string().required(),
  DB_PASS: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_LOGGING: Joi.boolean().default(false),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),

  PAYMENT_PROVIDER: Joi.string().valid('fake', 'mercadopago').required(),
  FAKE_PAYMENT_OUTCOME: Joi.string()
    .valid('approved', 'failed', 'pending')
    .default('approved'),
  FAKE_PAYMENT_DELAY_MS: Joi.number().default(3000),
  MERCADOPAGO_ACCESS_TOKEN: Joi.string().allow('').optional(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),

  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  SERVICE_NAME: Joi.string().default('ecommerce-api'),
});
