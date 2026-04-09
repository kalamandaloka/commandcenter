import { Module } from '@nestjs/common'
import { LogisticsController } from './logistics.controller'

@Module({
  controllers: [LogisticsController]
})
export class LogisticsModule {}

