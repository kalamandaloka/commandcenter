import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'

@UseGuards(AuthGuard)
@Controller('missions')
export class MissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query('scenarioRunId') scenarioRunId: string) {
    return this.prisma.mission.findMany({
      where: { scenarioRunId },
      orderBy: [{ phaseNumber: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
      include: { missionUnits: { include: { unit: true } }, orders: true }
    })
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.prisma.mission.findUnique({
      where: { id },
      include: { missionUnits: { include: { unit: true } }, orders: true, scenarioRun: { include: { scenario: true } } }
    })
  }

  @Post()
  create(
    @Body()
    body: {
      scenarioRunId: string
      name: string
      missionType: string
      objective?: string
      priority?: number
      phaseNumber?: number
      status?: string
    },
    @Req() req: { user?: { sub: string } }
  ) {
    return this.prisma.mission.create({
      data: {
        scenarioRunId: body.scenarioRunId,
        name: body.name,
        missionType: body.missionType,
        objective: body.objective,
        priority: body.priority ?? 3,
        phaseNumber: body.phaseNumber ?? 1,
        status: body.status ?? 'draft',
        createdByUserId: req.user?.sub
      },
      include: { missionUnits: { include: { unit: true } }, orders: true }
    })
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string
      missionType: string
      objective: string
      priority: number
      phaseNumber: number
      status: string
      approvedByUserId: string | null
    }>
  ) {
    return this.prisma.mission.update({
      where: { id },
      data: {
        name: body.name,
        missionType: body.missionType,
        objective: body.objective,
        priority: body.priority,
        phaseNumber: body.phaseNumber,
        status: body.status,
        approvedByUserId: body.approvedByUserId
      },
      include: { missionUnits: { include: { unit: true } }, orders: true }
    })
  }

  @Post(':id/assign-unit')
  assignUnit(@Param('id') missionId: string, @Body() body: { unitId: string; assignedRole?: string }) {
    return this.prisma.missionUnit.upsert({
      where: { missionId_unitId: { missionId, unitId: body.unitId } },
      create: { missionId, unitId: body.unitId, assignedRole: body.assignedRole },
      update: { assignedRole: body.assignedRole }
    })
  }
}
