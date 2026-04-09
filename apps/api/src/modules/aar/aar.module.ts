import { Module } from '@nestjs/common'
import { AARController } from './aar.controller'

@Module({
  controllers: [AARController]
})
export class AARModule {}

