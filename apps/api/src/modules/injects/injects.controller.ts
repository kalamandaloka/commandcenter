import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'
import { RealtimeGateway } from '../realtime/realtime.gateway'

@UseGuards(AuthGuard)
@Controller('injects')
export class InjectsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway
  ) {}

  @Get()
  list(@Query('scenarioId') scenarioId: string) {
    return this.prisma.eventInject.findMany({
      where: { scenarioId },
      orderBy: [{ triggerType: 'asc' }, { triggerOffsetMinutes: 'asc' }]
    })
  }

  @Post(':id/trigger')
  async trigger(@Param('id') id: string, @Body() body: { scenarioRunId: string }) {
    const inject = await this.prisma.eventInject.findUnique({ where: { id } })
    if (!inject) return { ok: false, error: 'Inject not found' }

    const now = new Date()

    await this.prisma.eventLog.create({
      data: {
        scenarioRunId: body.scenarioRunId,
        eventType: 'inject_triggered',
        title: inject.name,
        description: inject.description ?? null,
        severity: inject.injectType === 'threat' ? 'warning' : 'info',
        sourceType: 'inject',
        sourceId: inject.id,
        payloadJson: inject.effectJson ?? null,
        occurredAt: now
      }
    })

    if (inject.injectType === 'threat') {
      const run = await this.prisma.scenarioRun.findUnique({ where: { id: body.scenarioRunId } })
      if (run) {
        await this.prisma.threat.create({
          data: {
            scenarioRunId: run.id,
            name: inject.name,
            threatType: 'unknown',
            severity: 3,
            confidence: 55,
            xCoord: 110.8,
            yCoord: -2.2,
            status: 'active'
          }
        })
        const threats = await this.prisma.threat.findMany({ where: { scenarioRunId: run.id }, orderBy: { createdAt: 'asc' } })
        this.realtime.emit('threats:updated', { eventName: 'threats:updated', scenarioRunId: run.id, timestamp: now.toISOString(), payload: threats })
      }
    }

    this.realtime.emit('injects:triggered', { eventName: 'injects:triggered', scenarioRunId: body.scenarioRunId, timestamp: now.toISOString(), payload: inject })
    return { ok: true }
  }
}

