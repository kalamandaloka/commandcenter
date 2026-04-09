import { Module } from '@nestjs/common'
import { ThreatsController } from './threats.controller'

@Module({
  controllers: [ThreatsController]
})
export class ThreatsModule {}

