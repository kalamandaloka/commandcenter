import { Module } from '@nestjs/common'
import { ScenarioRunsController } from './scenario-runs.controller'
import { ScenarioRunsService } from './scenario-runs.service'
import { RealtimeModule } from '../realtime/realtime.module'

@Module({
  imports: [RealtimeModule],
  controllers: [ScenarioRunsController],
  providers: [ScenarioRunsService]
})
export class ScenarioRunsModule {}
