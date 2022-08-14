import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validate } from './utils/env.validation';
import { DBInit } from './utils/db.init';

@Module({
  imports: [validate(), DBInit()],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
