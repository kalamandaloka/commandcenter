import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'

type PatchUnitBody = Partial<{
  name: string
  readinessScore: number
  supplyScore: number
  moraleScore: number
  xCoord: number
  yCoord: number
  heading: number
  parentCommand: string
  status: string
}>

@UseGuards(AuthGuard)
@Controller('units')
export class UnitsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('scenarioId') scenarioId?: string, @Query('branch') branch?: string) {
    return this.prisma.unit.findMany({
      where: {
        scenarioId,
        branch
      },
      orderBy: [{ branch: 'asc' }, { code: 'asc' }]
    })
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.unit.findUnique({ where: { id } })
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() body: PatchUnitBody) {
    return this.prisma.unit.update({
      where: { id },
      data: {
        name: body.name,
        readinessScore: body.readinessScore,
        supplyScore: body.supplyScore,
        moraleScore: body.moraleScore,
        xCoord: body.xCoord,
        yCoord: body.yCoord,
        heading: body.heading,
        parentCommand: body.parentCommand,
        status: body.status
      }
    })
  }
}
