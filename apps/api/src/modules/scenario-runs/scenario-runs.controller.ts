import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { ScenarioRunsService } from './scenario-runs.service'

@UseGuards(AuthGuard)
@Controller('scenario-runs')
export class ScenarioRunsController {
  constructor(private readonly runs: ScenarioRunsService) {}

  @Get()
  list() {
    return this.runs.list()
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.runs.get(id)
  }

  @Post(':id/start')
  start(@Param('id') id: string) {
    return this.runs.start(id)
  }

  @Post(':id/pause')
  pause(@Param('id') id: string) {
    return this.runs.pause(id)
  }

  @Post(':id/reset')
  reset(@Param('id') id: string) {
    return this.runs.reset(id)
  }

  @Post(':id/speed')
  speed(@Param('id') id: string, @Body() body: { speed: number }) {
    return this.runs.speed(id, body.speed)
  }
}

