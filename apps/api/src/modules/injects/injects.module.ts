import { Module } from '@nestjs/common'
import { InjectsController } from './injects.controller'
import { RealtimeModule } from '../realtime/realtime.module'

@Module({
  imports: [RealtimeModule],
  controllers: [InjectsController]
})
export class InjectsModule {}
