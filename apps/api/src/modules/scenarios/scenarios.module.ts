import { Module } from '@nestjs/common'
import { ScenariosController } from './scenarios.controller'

@Module({
  controllers: [ScenariosController]
})
export class ScenariosModule {}

