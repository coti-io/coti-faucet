import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

export function validate() {
  return ConfigModule.forRoot({
    isGlobal: true,
    validationSchema: Joi.object({
      PORT: Joi.number().default(3000),
      DB_HOST: Joi.string(),
      DB_PORT: Joi.number(),
      DB_USER: Joi.string(),
      DB_PASSWORD: Joi.string(),
      DB_NAME: Joi.string(),
      CONNECTION_LIMIT: Joi.number(),
      SIGNATURE_EXPIRATION_VALIDATION_IN_SECONDS: Joi.number(),
      WALLET_SEED: Joi.string(),
      NETWORK: Joi.string(),
      FULL_NODE: Joi.string(),
      TRUST_SCORE_NODE: Joi.string(),
    }),
    validationOptions: {
      allowUnknown: true, // TODO Check
      abortEarly: true,
    },
  });
}
