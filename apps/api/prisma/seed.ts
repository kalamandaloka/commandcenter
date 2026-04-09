import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

function seededCoords(index: number) {
  const baseX = 110.0
  const baseY = -2.0
  const x = baseX + (index % 10) * 0.35 + (index % 3) * 0.05
  const y = baseY + Math.floor(index / 10) * 0.35 + (index % 4) * 0.03
  return { x, y }
}

export async function seedAll(prisma: PrismaClient) {
  const passwordHash = await bcrypt.hash('password123', 10)

  const users = [
    { name: 'Commander Demo', email: 'commander@example.local', role: 'commander' },
    { name: 'Ops Demo', email: 'ops@example.local', role: 'operations' },
    { name: 'Intel Demo', email: 'intel@example.local', role: 'intelligence' },
    { name: 'Logistics Demo', email: 'log@example.local', role: 'logistics' },
    { name: 'Director Demo', email: 'director@example.local', role: 'director' },
    { name: 'Evaluator Demo', email: 'evaluator@example.local', role: 'evaluator' }
  ]

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: { ...user, passwordHash },
      update: { name: user.name, role: user.role, passwordHash, isActive: true }
    })
  }

  const scenario = await prisma.scenario.upsert({
    where: { slug: 'pulau-terluar' },
    create: {
      name: 'Pertahanan Wilayah Strategis / Pulau Terluar',
      slug: 'pulau-terluar',
      description: 'Skenario MVP latihan gabungan level komando (data dummy).',
      areaName: 'AOI Pulau Terluar (Dummy)',
      scenarioType: 'mvp',
      initialPhase: 1,
      totalPhases: 3,
      status: 'active',
      isTemplate: true
    },
    update: {
      name: 'Pertahanan Wilayah Strategis / Pulau Terluar',
      description: 'Skenario MVP latihan gabungan level komando (data dummy).',
      areaName: 'AOI Pulau Terluar (Dummy)',
      scenarioType: 'mvp',
      initialPhase: 1,
      totalPhases: 3,
      status: 'active',
      isTemplate: true
    }
  })

  const phases = [
    { phaseNumber: 1, name: 'Detection & Preparation', description: 'Situasi awal dan persiapan respon.' },
    { phaseNumber: 2, name: 'Deployment & Coordination', description: 'Koordinasi lintas matra dan pergerakan unit.' },
    { phaseNumber: 3, name: 'Response & Stabilization', description: 'Respon utama dan stabilisasi situasi.' }
  ]

  for (const phase of phases) {
    await prisma.scenarioPhase.upsert({
      where: { scenarioId_phaseNumber: { scenarioId: scenario.id, phaseNumber: phase.phaseNumber } },
      create: { scenarioId: scenario.id, ...phase, startOffsetMinutes: (phase.phaseNumber - 1) * 30, endOffsetMinutes: phase.phaseNumber * 30 },
      update: { name: phase.name, description: phase.description, startOffsetMinutes: (phase.phaseNumber - 1) * 30, endOffsetMinutes: phase.phaseNumber * 30 }
    })
  }

  const unitDefs: Array<{ code: string; name: string; branch: string; status?: string }> = [
    { code: 'LND-A1', name: 'Infantry Task Force Alpha', branch: 'land', status: 'ready' },
    { code: 'LND-B1', name: 'Mechanized Detachment Bravo', branch: 'land', status: 'ready' },
    { code: 'LND-C1', name: 'Coastal Defense Unit Charlie', branch: 'land', status: 'idle' },
    { code: 'LND-D1', name: 'Reserve Unit Delta', branch: 'land', status: 'idle' },
    { code: 'LND-E1', name: 'Rapid Response Unit Echo', branch: 'land', status: 'ready' },

    { code: 'SEA-A1', name: 'Patrol Squadron Alpha', branch: 'sea', status: 'moving' },
    { code: 'SEA-B1', name: 'Frigate Group Bravo', branch: 'sea', status: 'ready' },
    { code: 'SEA-C1', name: 'Support Vessel Charlie', branch: 'sea', status: 'idle' },
    { code: 'SEA-D1', name: 'Amphibious Support Delta', branch: 'sea', status: 'ready' },
    { code: 'SEA-E1', name: 'Maritime Surveillance Element Echo', branch: 'sea', status: 'idle' },

    { code: 'AIR-A1', name: 'Fighter Flight Alpha', branch: 'air', status: 'ready' },
    { code: 'AIR-B1', name: 'Reconnaissance Flight Bravo', branch: 'air', status: 'ready' },
    { code: 'AIR-C1', name: 'Transport Flight Charlie', branch: 'air', status: 'idle' },
    { code: 'AIR-D1', name: 'Helicopter Support Delta', branch: 'air', status: 'idle' },
    { code: 'AIR-E1', name: 'Air Defense Support Echo', branch: 'air', status: 'ready' },

    { code: 'LOG-A1', name: 'Main Depot Alpha', branch: 'logistics', status: 'ready' },
    { code: 'LOG-B1', name: 'Forward Supply Bravo', branch: 'logistics', status: 'idle' },
    { code: 'LOG-C1', name: 'Mobile Medical Charlie', branch: 'logistics', status: 'idle' },
    { code: 'LOG-D1', name: 'Fuel Support Delta', branch: 'logistics', status: 'ready' },
    { code: 'LOG-E1', name: 'Spare Parts Support Echo', branch: 'logistics', status: 'idle' }
  ]

  const expandedUnits = [...unitDefs]
  for (let i = 0; i < 15; i++) {
    expandedUnits.push({
      code: `LND-X${String(i + 1).padStart(2, '0')}`,
      name: `Land Element ${i + 1}`,
      branch: 'land',
      status: i % 3 === 0 ? 'ready' : 'idle'
    })
  }

  for (let i = 0; i < expandedUnits.length; i++) {
    const def = expandedUnits[i]
    const { x, y } = seededCoords(i)
    await prisma.unit.upsert({
      where: { scenarioId_code: { scenarioId: scenario.id, code: def.code } },
      create: {
        scenarioId: scenario.id,
        name: def.name,
        code: def.code,
        branch: def.branch,
        unitType: 'dummy',
        category: 'demo',
        readinessScore: 70 + (i % 25),
        supplyScore: 60 + (i % 35),
        moraleScore: 65 + (i % 30),
        xCoord: x,
        yCoord: y,
        heading: (i * 17) % 360,
        parentCommand: 'Joint Command',
        status: def.status ?? 'idle'
      },
      update: {
        name: def.name,
        branch: def.branch,
        readinessScore: 70 + (i % 25),
        supplyScore: 60 + (i % 35),
        moraleScore: 65 + (i % 30),
        xCoord: x,
        yCoord: y,
        heading: (i * 17) % 360,
        parentCommand: 'Joint Command',
        status: def.status ?? 'idle'
      }
    })
  }

  const threats = [
    { name: 'Unknown Air Contact', threatType: 'air_contact', severity: 4, confidence: 55 },
    { name: 'Sea Contact Near Chokepoint', threatType: 'sea_contact', severity: 3, confidence: 60 },
    { name: 'Potential Land Intrusion', threatType: 'land_intrusion', severity: 3, confidence: 45 },
    { name: 'Logistics Disruption Signal', threatType: 'logistics_disruption', severity: 2, confidence: 40 }
  ]

  const scenarioRun = await prisma.scenarioRun.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      scenarioId: scenario.id,
      currentPhase: 1,
      simulationStatus: 'not_started',
      simulationSpeed: 1
    },
    update: { scenarioId: scenario.id }
  })

  for (let i = 0; i < threats.length; i++) {
    const t = threats[i]
    const { x, y } = seededCoords(100 + i)
    await prisma.threat.upsert({
      where: { id: `00000000-0000-0000-0000-00000000010${i}` },
      create: {
        id: `00000000-0000-0000-0000-00000000010${i}`,
        scenarioRunId: scenarioRun.id,
        name: t.name,
        threatType: t.threatType,
        severity: t.severity,
        confidence: t.confidence,
        xCoord: x,
        yCoord: y,
        status: 'active'
      },
      update: {
        scenarioRunId: scenarioRun.id,
        name: t.name,
        threatType: t.threatType,
        severity: t.severity,
        confidence: t.confidence,
        xCoord: x,
        yCoord: y,
        status: 'active'
      }
    })
  }

  const nodes = [
    { name: 'Main Base Alpha', nodeType: 'main_base', stock: 1200 },
    { name: 'Forward Base Bravo', nodeType: 'forward_base', stock: 700 },
    { name: 'Port Charlie', nodeType: 'port', stock: 900 },
    { name: 'Airbase Delta', nodeType: 'airbase', stock: 800 },
    { name: 'Depot Echo', nodeType: 'depot', stock: 1100 }
  ]

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    const { x, y } = seededCoords(200 + i)
    await prisma.logisticsNode.upsert({
      where: { id: `00000000-0000-0000-0000-00000000020${i}` },
      create: {
        id: `00000000-0000-0000-0000-00000000020${i}`,
        scenarioId: scenario.id,
        name: n.name,
        nodeType: n.nodeType,
        xCoord: x,
        yCoord: y,
        status: 'active',
        fuelStock: Math.floor(n.stock * 0.35),
        ammoStock: Math.floor(n.stock * 0.25),
        rationStock: Math.floor(n.stock * 0.2),
        medicalStock: Math.floor(n.stock * 0.1),
        spareStock: Math.floor(n.stock * 0.1)
      },
      update: {
        scenarioId: scenario.id,
        name: n.name,
        nodeType: n.nodeType,
        xCoord: x,
        yCoord: y,
        status: 'active',
        fuelStock: Math.floor(n.stock * 0.35),
        ammoStock: Math.floor(n.stock * 0.25),
        rationStock: Math.floor(n.stock * 0.2),
        medicalStock: Math.floor(n.stock * 0.1),
        spareStock: Math.floor(n.stock * 0.1)
      }
    })
  }

  const injects = [
    { name: 'Weather Degradation (North)', injectType: 'weather', triggerType: 'scheduled', triggerOffsetMinutes: 10 },
    { name: 'Communication Latency Increases', injectType: 'comms', triggerType: 'scheduled', triggerOffsetMinutes: 15 },
    { name: 'Supply Convoy Delayed', injectType: 'logistics', triggerType: 'scheduled', triggerOffsetMinutes: 25 },
    { name: 'New Sea Contact Approaching', injectType: 'threat', triggerType: 'manual', triggerOffsetMinutes: 0 }
  ]

  for (let i = 0; i < injects.length; i++) {
    const inj = injects[i]
    await prisma.eventInject.upsert({
      where: { id: `00000000-0000-0000-0000-00000000030${i}` },
      create: {
        id: `00000000-0000-0000-0000-00000000030${i}`,
        scenarioId: scenario.id,
        name: inj.name,
        injectType: inj.injectType,
        triggerType: inj.triggerType,
        triggerOffsetMinutes: inj.triggerOffsetMinutes,
        isEnabled: true,
        description: 'Dummy inject untuk demo',
        effectJson: JSON.stringify({ demo: true })
      },
      update: {
        scenarioId: scenario.id,
        name: inj.name,
        injectType: inj.injectType,
        triggerType: inj.triggerType,
        triggerOffsetMinutes: inj.triggerOffsetMinutes,
        isEnabled: true,
        description: 'Dummy inject untuk demo',
        effectJson: JSON.stringify({ demo: true })
      }
    })
  }
}

async function main() {
  const prisma = new PrismaClient()
  try {
    await seedAll(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((e) => {
    throw e
  })
}
