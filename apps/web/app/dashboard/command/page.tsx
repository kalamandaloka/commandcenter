"use client"

import { CommandDashboardShell, type DashboardMapProps } from './CommandDashboardShell'
import { OperationalMap } from './OperationalMap'

function CommandOperationalMap(props: DashboardMapProps) {
  return (
    <OperationalMap
      units={props.units}
      threats={props.threats}
      scenarioId={props.scenarioId}
      scenarioRunId={props.scenarioRunId}
      orders={props.orders}
      height={props.height}
      mode="command"
      showLegend={false}
      showControls={false}
    />
  )
}

export default function CommandDashboardPage() {
  return <CommandDashboardShell Map={CommandOperationalMap} />
}
