import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'

@UseGuards(AuthGuard)
@Controller('aar')
export class AARController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':scenarioRunId')
  async summary(@Param('scenarioRunId') scenarioRunId: string) {
    const [run, missions, orders, threats, events, decisions] = await Promise.all([
      this.prisma.scenarioRun.findUnique({ where: { id: scenarioRunId }, include: { scenario: true } }),
      this.prisma.mission.findMany({ where: { scenarioRunId } }),
      this.prisma.order.findMany({ where: { scenarioRunId } }),
      this.prisma.threat.findMany({ where: { scenarioRunId } }),
      this.prisma.eventLog.findMany({ where: { scenarioRunId } }),
      this.prisma.decisionLog.findMany({ where: { scenarioRunId } })
    ])

    const objectiveScore = Math.min(100, missions.filter((m) => m.status === 'completed').length * 20 + orders.filter((o) => o.approvalStatus === 'approved').length * 5)
    const coordinationScore = Math.min(100, orders.filter((o) => o.executionStatus === 'executing').length * 10 + missions.length * 2)
    const logisticsScore = Math.max(0, 100 - Math.min(100, events.filter((e) => e.eventType.includes('logistics')).length * 10))
    const responseTimeScore = Math.max(0, 100 - Math.min(100, threats.length * 8))

    return {
      run,
      counts: { missions: missions.length, orders: orders.length, threats: threats.length, events: events.length, decisions: decisions.length },
      scores: { objectiveScore, coordinationScore, logisticsScore, responseTimeScore }
    }
  }

  @Post(':scenarioRunId/generate')
  async generate(@Param('scenarioRunId') scenarioRunId: string) {
    const summary = await this.summary(scenarioRunId)
    const title = `AAR Summary ${scenarioRunId}`
    const report = await this.prisma.aARReport.create({
      data: {
        scenarioRunId,
        title,
        summary: JSON.stringify(summary),
        objectiveScore: summary.scores.objectiveScore,
        coordinationScore: summary.scores.coordinationScore,
        logisticsScore: summary.scores.logisticsScore,
        responseTimeScore: summary.scores.responseTimeScore,
        recommendationsJson: JSON.stringify({
          recommendations: [
            'Perjelas approval flow order sebelum eksekusi.',
            'Perkuat kesiapan logistik di node forward base.',
            'Tingkatkan deteksi awal untuk mengurangi jumlah threat aktif.'
          ]
        })
      }
    })
    return report
  }
}
