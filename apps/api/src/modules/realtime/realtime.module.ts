import { Module } from '@nestjs/common'
import { RealtimeGateway } from './realtime.gateway'
import { SimulationService } from './simulation.service'

@Module({
  providers: [RealtimeGateway, SimulationService],
  exports: [RealtimeGateway, SimulationService]
})
export class RealtimeModule {}

