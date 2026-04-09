import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'

type CreateScenarioBody = {
  name: string
  slug: string
  description?: string
  areaName?: string
  scenarioType?: string
  initialPhase?: number
  totalPhases?: number
  status?: string
  isTemplate?: boolean
}

type PatchScenarioBody = Partial<CreateScenarioBody>

@UseGuards(AuthGuard)
@Controller('scenarios')
export class ScenariosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('status') status?: string) {
    return this.prisma.scenario.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'asc' }
    })
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.scenario.findUnique({
      where: { id },
      include: { phases: { orderBy: { phaseNumber: 'asc' } } }
    })
  }

  @Post()
  async create(@Body() body: CreateScenarioBody) {
    return this.prisma.scenario.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        areaName: body.areaName,
        scenarioType: body.scenarioType,
        initialPhase: body.initialPhase ?? 1,
        totalPhases: body.totalPhases ?? 1,
        status: body.status ?? 'active',
        isTemplate: body.isTemplate ?? true
      }
    })
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() body: PatchScenarioBody) {
    return this.prisma.scenario.update({
      where: { id },
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        areaName: body.areaName,
        scenarioType: body.scenarioType,
        initialPhase: body.initialPhase,
        totalPhases: body.totalPhases,
        status: body.status,
        isTemplate: body.isTemplate
      }
    })
  }

  @Post(':id/start-run')
  async startRun(@Param('id') scenarioId: string, @Req() req: { user?: { sub: string } }) {
    const run = await this.prisma.scenarioRun.create({
      data: {
        scenarioId,
        startedByUserId: req.user?.sub,
        currentPhase: 1,
        simulationStatus: 'not_started',
        simulationSpeed: 1
      }
    })
    return run
  }
}
