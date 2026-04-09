import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SimulationService } from '../realtime/simulation.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'

@Injectable()
export class ScenarioRunsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly simulation: SimulationService,
    private readonly realtime: RealtimeGateway
  ) {}

  async list() {
    return this.prisma.scenarioRun.findMany({
      orderBy: { createdAt: 'desc' },
      include: { scenario: true }
    })
  }

  async get(id: string) {
    const run = await this.prisma.scenarioRun.findUnique({
      where: { id },
      include: { scenario: { include: { phases: { orderBy: { phaseNumber: 'asc' } } } } }
    })
    if (!run) throw new NotFoundException('ScenarioRun not found')
    return run
  }

  async start(id: string) {
    const run = await this.get(id)
    const now = new Date()
    const updated = await this.prisma.scenarioRun.update({
      where: { id },
      data: {
        simulationStatus: 'running',
        startedAt: run.startedAt ?? now,
        pausedAt: null,
        endedAt: null
      }
    })
    this.simulation.startTicks(updated.id, updated.simulationSpeed)
    this.realtime.emit('simulation:statusChanged', {
      eventName: 'simulation:statusChanged',
      scenarioRunId: updated.id,
      timestamp: new Date().toISOString(),
      payload: { simulationStatus: updated.simulationStatus }
    })
    this.realtime.emit('scenarioRun:updated', {
      eventName: 'scenarioRun:updated',
      scenarioRunId: updated.id,
      timestamp: new Date().toISOString(),
      payload: updated
    })
    return updated
  }

  async pause(id: string) {
    await this.get(id)
    const updated = await this.prisma.scenarioRun.update({
      where: { id },
      data: { simulationStatus: 'paused', pausedAt: new Date() }
    })
    this.simulation.stopTicks(updated.id)
    this.realtime.emit('simulation:statusChanged', {
      eventName: 'simulation:statusChanged',
      scenarioRunId: updated.id,
      timestamp: new Date().toISOString(),
      payload: { simulationStatus: updated.simulationStatus }
    })
    return updated
  }

  async reset(id: string) {
    await this.get(id)
    const updated = await this.prisma.scenarioRun.update({
      where: { id },
      data: {
        currentPhase: 1,
        simulationStatus: 'not_started',
        simulationSpeed: 1,
        startedAt: null,
        pausedAt: null,
        endedAt: null
      }
    })
    this.simulation.stopTicks(updated.id)
    this.realtime.emit('scenarioRun:updated', {
      eventName: 'scenarioRun:updated',
      scenarioRunId: updated.id,
      timestamp: new Date().toISOString(),
      payload: updated
    })
    return updated
  }

  async speed(id: string, speed: number) {
    await this.get(id)
    const nextSpeed = Math.max(1, Math.min(10, Math.floor(speed)))
    const updated = await this.prisma.scenarioRun.update({
      where: { id },
      data: { simulationSpeed: nextSpeed }
    })
    if (updated.simulationStatus === 'running') this.simulation.startTicks(updated.id, updated.simulationSpeed)
    this.realtime.emit('scenarioRun:updated', {
      eventName: 'scenarioRun:updated',
      scenarioRunId: updated.id,
      timestamp: new Date().toISOString(),
      payload: updated
    })
    return updated
  }
}

