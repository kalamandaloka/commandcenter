import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'

@UseGuards(AuthGuard)
@Controller('logistics')
export class LogisticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('nodes')
  listNodes(@Query('scenarioId') scenarioId: string) {
    return this.prisma.logisticsNode.findMany({
      where: { scenarioId },
      orderBy: { name: 'asc' }
    })
  }

  @Patch('nodes/:id')
  updateNode(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      status: string
      fuelStock: number
      ammoStock: number
      rationStock: number
      medicalStock: number
      spareStock: number
    }>
  ) {
    return this.prisma.logisticsNode.update({
      where: { id },
      data: {
        status: body.status,
        fuelStock: body.fuelStock,
        ammoStock: body.ammoStock,
        rationStock: body.rationStock,
        medicalStock: body.medicalStock,
        spareStock: body.spareStock
      }
    })
  }

  @Get('missions')
  listMissions(@Query('scenarioRunId') scenarioRunId: string) {
    return this.prisma.logisticsMission.findMany({
      where: { scenarioRunId },
      orderBy: { createdAt: 'desc' },
      include: { fromNode: true, toNode: true }
    })
  }

  @Post('missions')
  createMission(
    @Body()
    body: {
      scenarioRunId: string
      fromNodeId: string
      toNodeId: string
      transportMode: string
      fuelAmount?: number
      ammoAmount?: number
      rationAmount?: number
      medicalAmount?: number
      spareAmount?: number
      etaMinutes?: number
    }
  ) {
    return this.prisma.logisticsMission.create({
      data: {
        scenarioRunId: body.scenarioRunId,
        fromNodeId: body.fromNodeId,
        toNodeId: body.toNodeId,
        transportMode: body.transportMode,
        status: 'planned',
        fuelAmount: body.fuelAmount ?? 0,
        ammoAmount: body.ammoAmount ?? 0,
        rationAmount: body.rationAmount ?? 0,
        medicalAmount: body.medicalAmount ?? 0,
        spareAmount: body.spareAmount ?? 0,
        etaMinutes: body.etaMinutes ?? 60
      }
    })
  }
}

