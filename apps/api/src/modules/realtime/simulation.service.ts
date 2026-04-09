import { Injectable } from '@nestjs/common'
import { RealtimeGateway } from './realtime.gateway'
import { PrismaService } from '../prisma/prisma.service'

type TickPayload = { eventName: string; scenarioRunId: string; timestamp: string; payload: unknown }

@Injectable()
export class SimulationService {
  private readonly timers = new Map<string, NodeJS.Timeout>()
  private readonly inFlight = new Set<string>()

  constructor(
    private readonly realtime: RealtimeGateway,
    private readonly prisma: PrismaService
  ) {}

  startTicks(scenarioRunId: string, speed: number) {
    this.stopTicks(scenarioRunId)
    const tickMs = Math.max(250, Math.floor(1000 / Math.max(1, speed)))
    const timer = setInterval(() => {
      const now = new Date()
      const payload: TickPayload = {
        eventName: 'simulation:tick',
        scenarioRunId,
        timestamp: now.toISOString(),
        payload: { now: now.toISOString() }
      }
      this.realtime.emit('simulation:tick', payload)
      void this.step(scenarioRunId)
    }, tickMs)
    this.timers.set(scenarioRunId, timer)
  }

  stopTicks(scenarioRunId: string) {
    const timer = this.timers.get(scenarioRunId)
    if (timer) clearInterval(timer)
    this.timers.delete(scenarioRunId)
    this.inFlight.delete(scenarioRunId)
  }

  private async step(scenarioRunId: string) {
    if (this.inFlight.has(scenarioRunId)) return
    this.inFlight.add(scenarioRunId)
    try {
      const run = await this.prisma.scenarioRun.findUnique({ where: { id: scenarioRunId } })
      if (!run || run.simulationStatus !== 'running') return

      const units = await this.prisma.unit.findMany({
        where: { scenarioId: run.scenarioId },
        orderBy: { code: 'asc' },
        take: 40
      })

      const updatedUnits = await this.prisma.$transaction(
        units.map((u, idx) => {
          const dx = ((idx % 3) - 1) * 0.002 * Math.max(1, run.simulationSpeed)
          const dy = (((idx + 1) % 3) - 1) * 0.0015 * Math.max(1, run.simulationSpeed)
          const nextHeading = ((u.heading ?? 0) + 15 + idx) % 360
          return this.prisma.unit.update({
            where: { id: u.id },
            data: { xCoord: u.xCoord + dx, yCoord: u.yCoord + dy, heading: nextHeading }
          })
        })
      )

      this.realtime.emit('units:updated', {
        eventName: 'units:updated',
        scenarioRunId,
        timestamp: new Date().toISOString(),
        payload: updatedUnits
      })

      const threats = await this.prisma.threat.findMany({
        where: { scenarioRunId },
        orderBy: { createdAt: 'asc' }
      })
      this.realtime.emit('threats:updated', {
        eventName: 'threats:updated',
        scenarioRunId,
        timestamp: new Date().toISOString(),
        payload: threats
      })
    } finally {
      this.inFlight.delete(scenarioRunId)
    }
  }
}
