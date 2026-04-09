"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/app/lib/api'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

type Scenario = { id: string; name: string }
type ScenarioRun = { id: string; scenarioId: string; simulationStatus: string; simulationSpeed: number; currentPhase: number; createdAt: string; startedAt?: string | null }

type Unit = { id: string; branch: string; status: string }

type LogisticsNode = {
  id: string
  scenarioId: string
  name: string
  nodeType: string
  xCoord: number
  yCoord: number
  status: string | null
  fuelStock: number
  ammoStock: number
  rationStock: number
  medicalStock: number
  spareStock: number
}

type LogisticsMission = {
  id: string
  scenarioRunId: string
  fromNodeId: string
  toNodeId: string
  transportMode: string
  status: string | null
  fuelAmount: number
  ammoAmount: number
  rationAmount: number
  medicalAmount: number
  spareAmount: number
  etaMinutes: number
  createdAt: string
  fromNode?: LogisticsNode
  toNode?: LogisticsNode
}

type StockTotals = { fuel: number; ammo: number; ration: number; medical: number; spare: number }

export default function LogisticsPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<DemoRole>('logistics')
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [runs, setRuns] = useState<ScenarioRun[]>([])
  const [nodes, setNodes] = useState<LogisticsNode[]>([])
  const [missions, setMissions] = useState<LogisticsMission[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [baselineTotals, setBaselineTotals] = useState<StockTotals | null>(null)

  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)

  const [fromNodeId, setFromNodeId] = useState<string>('')
  const [toNodeId, setToNodeId] = useState<string>('')
  const [transportMode, setTransportMode] = useState<string>('ground')
  const [fuelAmount, setFuelAmount] = useState<number>(0)
  const [ammoAmount, setAmmoAmount] = useState<number>(0)
  const [rationAmount, setRationAmount] = useState<number>(0)
  const [medicalAmount, setMedicalAmount] = useState<number>(0)
  const [spareAmount, setSpareAmount] = useState<number>(0)
  const [etaMinutes, setEtaMinutes] = useState<number>(60)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const activeScenario = useMemo(() => scenarios.find((s) => s.id === activeScenarioId) ?? null, [scenarios, activeScenarioId])
  const activeRun = useMemo(() => runs.find((r) => r.id === activeRunId) ?? null, [runs, activeRunId])
  const canCreateResupply = role === 'logistics' || role === 'director'

  function sumStocks(list: LogisticsNode[]): StockTotals {
    return list.reduce<StockTotals>(
      (acc, n) => {
        acc.fuel += n.fuelStock ?? 0
        acc.ammo += n.ammoStock ?? 0
        acc.ration += n.rationStock ?? 0
        acc.medical += n.medicalStock ?? 0
        acc.spare += n.spareStock ?? 0
        return acc
      },
      { fuel: 0, ammo: 0, ration: 0, medical: 0, spare: 0 }
    )
  }

  function clampPct(v: number) {
    if (!Number.isFinite(v)) return 0
    return Math.max(0, Math.min(100, v))
  }

  useEffect(() => {
    const t = localStorage.getItem('token')
    if (!t) {
      router.replace('/login')
      return
    }
    setToken(t)
    const u = getStoredUser()
    if (u) {
      setRole(u.role)
      if (!isRoleAllowedForPath(u.role, '/logistics')) {
        router.replace(getDefaultRouteForRole(u.role))
      }
    }
  }, [router])

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    Promise.all([apiRequest<Scenario[]>('/scenarios', { token }), apiRequest<ScenarioRun[]>('/scenario-runs', { token })])
      .then(([s, r]) => {
        setScenarios(s)
        setRuns(r)
        setActiveScenarioId((prev) => prev ?? s[0]?.id ?? null)
        setActiveRunId((prev) => prev ?? r[0]?.id ?? null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    if (!activeScenarioId) return
    const raw = localStorage.getItem(`logBase:${activeScenarioId}`)
    if (!raw) {
      setBaselineTotals(null)
      return
    }
    try {
      const parsed = JSON.parse(raw) as StockTotals
      if (parsed && typeof parsed === 'object') setBaselineTotals(parsed)
    } catch {
      setBaselineTotals(null)
    }
  }, [activeScenarioId])

  useEffect(() => {
    if (!token || !activeScenarioId) return
    setError(null)
    apiRequest<LogisticsNode[]>(`/logistics/nodes?scenarioId=${encodeURIComponent(activeScenarioId)}`, { token })
      .then((n) => {
        setNodes(n)
        const currentTotals = sumStocks(n)
        setBaselineTotals((prev) => {
          if (prev) return prev
          localStorage.setItem(`logBase:${activeScenarioId}`, JSON.stringify(currentTotals))
          return currentTotals
        })
        if (!fromNodeId && n[0]?.id) setFromNodeId(n[0].id)
        if (!toNodeId && n[1]?.id) setToNodeId(n[1].id)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load nodes failed'))
  }, [token, activeScenarioId, fromNodeId, toNodeId])

  useEffect(() => {
    if (!token || !activeScenarioId) return
    apiRequest<Unit[]>(`/units?scenarioId=${encodeURIComponent(activeScenarioId)}`, { token })
      .then(setUnits)
      .catch(() => {})
  }, [token, activeScenarioId])

  useEffect(() => {
    if (!token || !activeRunId) return
    setError(null)
    apiRequest<LogisticsMission[]>(`/logistics/missions?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token })
      .then(setMissions)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load missions failed'))
  }, [token, activeRunId])

  async function createMission() {
    if (!token || !activeRunId || !fromNodeId || !toNodeId) return
    setLoading(true)
    setError(null)
    try {
      const created = await apiRequest<LogisticsMission>('/logistics/missions', {
        method: 'POST',
        token,
        body: JSON.stringify({
          scenarioRunId: activeRunId,
          fromNodeId,
          toNodeId,
          transportMode,
          fuelAmount,
          ammoAmount,
          rationAmount,
          medicalAmount,
          spareAmount,
          etaMinutes
        })
      })
      setMissions((prev) => [created, ...prev])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create mission')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.replace('/login')
  }

  const currentTotals = useMemo(() => sumStocks(nodes), [nodes])

  const sustainment = useMemo(() => {
    const base = baselineTotals
    if (!base) {
      return {
        healthPct: 100,
        byResource: { fuel: 100, ammo: 100, ration: 100, medical: 100, spare: 100 }
      }
    }
    const byResource = {
      fuel: clampPct((currentTotals.fuel / Math.max(1, base.fuel)) * 100),
      ammo: clampPct((currentTotals.ammo / Math.max(1, base.ammo)) * 100),
      ration: clampPct((currentTotals.ration / Math.max(1, base.ration)) * 100),
      medical: clampPct((currentTotals.medical / Math.max(1, base.medical)) * 100),
      spare: clampPct((currentTotals.spare / Math.max(1, base.spare)) * 100)
    }
    const healthPct = Math.round((byResource.fuel + byResource.ammo + byResource.ration + byResource.medical + byResource.spare) / 5)
    return { healthPct, byResource }
  }, [baselineTotals, currentTotals])

  const unitCounts = useMemo(() => {
    const counts: Record<string, number> = { land: 0, sea: 0, air: 0, logistics: 0, other: 0 }
    for (const u of units) {
      if (u.branch === 'land' || u.branch === 'sea' || u.branch === 'air' || u.branch === 'logistics') counts[u.branch]++
      else counts.other++
    }
    return counts
  }, [units])

  const consumptionRates = useMemo(() => {
    const perMin = {
      land: { fuel: 1.0, ammo: 0.6, ration: 0.8, medical: 0.05, spare: 0.08 },
      sea: { fuel: 1.2, ammo: 0.5, ration: 0.5, medical: 0.03, spare: 0.07 },
      air: { fuel: 1.8, ammo: 0.8, ration: 0.4, medical: 0.02, spare: 0.09 },
      logistics: { fuel: 0.4, ammo: 0.1, ration: 0.2, medical: 0.01, spare: 0.04 },
      other: { fuel: 0.2, ammo: 0.1, ration: 0.2, medical: 0.01, spare: 0.02 }
    }
    const scale = Math.max(1, activeRun?.simulationSpeed ?? 1)
    const totalsPerMin: StockTotals = {
      fuel: (unitCounts.land * perMin.land.fuel + unitCounts.sea * perMin.sea.fuel + unitCounts.air * perMin.air.fuel + unitCounts.logistics * perMin.logistics.fuel + unitCounts.other * perMin.other.fuel) * scale,
      ammo: (unitCounts.land * perMin.land.ammo + unitCounts.sea * perMin.sea.ammo + unitCounts.air * perMin.air.ammo + unitCounts.logistics * perMin.logistics.ammo + unitCounts.other * perMin.other.ammo) * scale,
      ration: (unitCounts.land * perMin.land.ration + unitCounts.sea * perMin.sea.ration + unitCounts.air * perMin.air.ration + unitCounts.logistics * perMin.logistics.ration + unitCounts.other * perMin.other.ration) * scale,
      medical: (unitCounts.land * perMin.land.medical + unitCounts.sea * perMin.sea.medical + unitCounts.air * perMin.air.medical + unitCounts.logistics * perMin.logistics.medical + unitCounts.other * perMin.other.medical) * scale,
      spare: (unitCounts.land * perMin.land.spare + unitCounts.sea * perMin.sea.spare + unitCounts.air * perMin.air.spare + unitCounts.logistics * perMin.logistics.spare + unitCounts.other * perMin.other.spare) * scale
    }
    const perHour: StockTotals = {
      fuel: Math.round(totalsPerMin.fuel * 60),
      ammo: Math.round(totalsPerMin.ammo * 60),
      ration: Math.round(totalsPerMin.ration * 60),
      medical: Math.round(totalsPerMin.medical * 60),
      spare: Math.round(totalsPerMin.spare * 60)
    }
    return { perMin: totalsPerMin, perHour }
  }, [unitCounts, activeRun?.simulationSpeed])

  const depletion = useMemo(() => {
    const perHour = consumptionRates.perHour
    const hours = {
      fuel: perHour.fuel > 0 ? Math.max(0, currentTotals.fuel / perHour.fuel) : null,
      ammo: perHour.ammo > 0 ? Math.max(0, currentTotals.ammo / perHour.ammo) : null,
      ration: perHour.ration > 0 ? Math.max(0, currentTotals.ration / perHour.ration) : null,
      medical: perHour.medical > 0 ? Math.max(0, currentTotals.medical / perHour.medical) : null,
      spare: perHour.spare > 0 ? Math.max(0, currentTotals.spare / perHour.spare) : null
    }
    return hours
  }, [consumptionRates.perHour, currentTotals])

  const depletionTrend = useMemo(() => {
    const base = baselineTotals
    const startAt = activeRun?.startedAt ? new Date(activeRun.startedAt).getTime() : activeRun?.createdAt ? new Date(activeRun.createdAt).getTime() : Date.now()
    const elapsedMin = Math.max(0, (Date.now() - startAt) / 60000)
    const samples = 16
    const spanMin = 60
    const points: Array<{ t: number; v: number }> = []
    for (let i = 0; i < samples; i++) {
      const t = -spanMin + (i * spanMin) / (samples - 1)
      if (!base || elapsedMin <= 0) {
        const ratio = base ? currentTotals.fuel / Math.max(1, base.fuel) : 1
        points.push({ t, v: ratio })
        continue
      }
      const frac = clampPct(((elapsedMin + t) / elapsedMin) * 100) / 100
      const est = base.fuel - (base.fuel - currentTotals.fuel) * frac
      points.push({ t, v: est / Math.max(1, base.fuel) })
    }
    return points
  }, [baselineTotals, currentTotals.fuel, activeRun?.startedAt, activeRun?.createdAt])

  const delayedMissions = useMemo(() => {
    const now = Date.now()
    return missions.filter((m) => {
      const created = new Date(m.createdAt).getTime()
      const eta = Math.max(0, m.etaMinutes ?? 0) * 60000
      const isLate = now - created > Math.max(eta, 15 * 60000) * 1.2
      const status = (m.status ?? '').toLowerCase()
      return status.includes('delayed') || (status !== 'completed' && isLate)
    })
  }, [missions])

  return (
    <main style={{ padding: 16, display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>Logistics</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Nodes • consumption • depletion • delayed alerts (demo)</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/logistics/nodes')} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            Nodes
          </button>
          <button onClick={() => router.push('/logistics/missions')} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            Missions
          </button>
          <button onClick={() => router.push('/dashboard/command')} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            Command
          </button>
          <button onClick={logout} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            Logout
          </button>
        </div>
      </header>

      {error ? <div style={{ color: '#fb7185' }}>{error}</div> : null}
      {loading ? <div style={{ opacity: 0.8 }}>Loading...</div> : null}

      <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Scenario</div>
            <select
              value={activeScenarioId ?? ''}
              onChange={(e) => setActiveScenarioId(e.target.value)}
              style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }}
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Scenario Run</div>
            <select
              value={activeRunId ?? ''}
              onChange={(e) => setActiveRunId(e.target.value)}
              style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }}
            >
              {runs
                .filter((r) => (!activeScenarioId ? true : r.scenarioId === activeScenarioId))
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id.slice(0, 8)} • {r.simulationStatus} • x{r.simulationSpeed}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Active: {activeScenario?.name ?? '-'} • Run: {activeRun?.id ?? '-'}
        </div>
      </section>

      <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontWeight: 600 }}>Sustainment</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>health {sustainment.healthPct}%</div>
        </div>
        <div style={{ height: 10, borderRadius: 999, background: '#0b1220', border: '1px solid #1f2937', overflow: 'hidden' }}>
          <div style={{ width: `${sustainment.healthPct}%`, height: '100%', background: sustainment.healthPct > 70 ? '#22c55e' : sustainment.healthPct > 40 ? '#f59e0b' : '#fb7185' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Fuel</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{Math.round(sustainment.byResource.fuel)}%</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{currentTotals.fuel}</div>
          </div>
          <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Ammo</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{Math.round(sustainment.byResource.ammo)}%</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{currentTotals.ammo}</div>
          </div>
          <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Ration</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{Math.round(sustainment.byResource.ration)}%</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{currentTotals.ration}</div>
          </div>
          <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Medical</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{Math.round(sustainment.byResource.medical)}%</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{currentTotals.medical}</div>
          </div>
          <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Spare</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{Math.round(sustainment.byResource.spare)}%</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{currentTotals.spare}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontWeight: 700 }}>Depletion Trend (Fuel)</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>~ last 60 min</div>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 44, paddingTop: 6 }}>
              {depletionTrend.map((p, idx) => (
                <div key={`${idx}:${p.t}`} style={{ flex: 1, height: `${Math.max(4, Math.min(44, Math.round(p.v * 44)))}px`, background: '#38bdf8', borderRadius: 4, opacity: 0.85 }} />
              ))}
            </div>
          </div>
          <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220', display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 700 }}>Consumption (est)</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>per hour: fuel {consumptionRates.perHour.fuel} • ammo {consumptionRates.perHour.ammo}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>ration {consumptionRates.perHour.ration} • medical {consumptionRates.perHour.medical} • spare {consumptionRates.perHour.spare}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              endurance: fuel {depletion.fuel == null ? '-' : `${depletion.fuel.toFixed(1)}h`} • ammo {depletion.ammo == null ? '-' : `${depletion.ammo.toFixed(1)}h`}
            </div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              ration {depletion.ration == null ? '-' : `${depletion.ration.toFixed(1)}h`} • medical {depletion.medical == null ? '-' : `${depletion.medical.toFixed(1)}h`}
            </div>
          </div>
        </div>
      </section>

      {delayedMissions.length ? (
        <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontWeight: 600 }}>Delayed Delivery Alerts</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{delayedMissions.length} missions</div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {delayedMissions.slice(0, 6).map((m) => (
              <div key={m.id} style={{ border: '1px solid #7f1d1d', borderRadius: 10, padding: 10, background: '#220c10', display: 'grid', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontWeight: 700 }}>{m.transportMode}</div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>{m.status ?? 'late'}</div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  {m.fromNode?.name ?? m.fromNodeId} → {m.toNode?.name ?? m.toNodeId} • ETA {m.etaMinutes}m
                </div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>createdAt: {m.createdAt}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 600 }}>Logistics Nodes</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {nodes.map((n) => (
            <div key={n.id} style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220', display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontWeight: 600 }}>{n.name}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{n.nodeType}</div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                fuel {n.fuelStock} • ammo {n.ammoStock} • ration {n.rationStock} • medical {n.medicalStock} • spare {n.spareStock}
              </div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>
                pos: {n.xCoord.toFixed(3)},{n.yCoord.toFixed(3)} • status: {n.status ?? '-'}
              </div>
            </div>
          ))}
          {!nodes.length ? <div style={{ fontSize: 12, opacity: 0.8 }}>Tidak ada node.</div> : null}
        </div>
      </section>

      {canCreateResupply ? (
        <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 600 }}>Create Resupply Mission</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>From</div>
              <select
                value={fromNodeId}
                onChange={(e) => setFromNodeId(e.target.value)}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }}
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>To</div>
              <select
                value={toNodeId}
                onChange={(e) => setToNodeId(e.target.value)}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }}
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Mode</div>
              <select
                value={transportMode}
                onChange={(e) => setTransportMode(e.target.value)}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }}
              >
                <option value="ground">ground</option>
                <option value="sea">sea</option>
                <option value="air">air</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Fuel
              <input value={fuelAmount} onChange={(e) => setFuelAmount(Number(e.target.value))} type="number" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Ammo
              <input value={ammoAmount} onChange={(e) => setAmmoAmount(Number(e.target.value))} type="number" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Ration
              <input value={rationAmount} onChange={(e) => setRationAmount(Number(e.target.value))} type="number" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Medical
              <input value={medicalAmount} onChange={(e) => setMedicalAmount(Number(e.target.value))} type="number" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Spare
              <input value={spareAmount} onChange={(e) => setSpareAmount(Number(e.target.value))} type="number" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              ETA (min)
              <input value={etaMinutes} onChange={(e) => setEtaMinutes(Number(e.target.value))} type="number" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }} />
            </label>
          </div>

          <button
            onClick={createMission}
            disabled={!activeRunId || !fromNodeId || !toNodeId || loading}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #22c55e', background: '#14532d', color: '#bbf7d0', height: 38, width: 200 }}
          >
            Create Mission
          </button>
        </section>
      ) : null}

      <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 600 }}>Resupply Missions</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {missions.map((m) => (
            <div key={m.id} style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220', display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontWeight: 600 }}>{m.transportMode}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{m.status ?? '-'}</div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                from {m.fromNode?.name ?? m.fromNodeId} → to {m.toNode?.name ?? m.toNodeId} • ETA {m.etaMinutes}m
              </div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>
                cargo: fuel {m.fuelAmount}, ammo {m.ammoAmount}, ration {m.rationAmount}, medical {m.medicalAmount}, spare {m.spareAmount}
              </div>
            </div>
          ))}
          {!missions.length ? <div style={{ fontSize: 12, opacity: 0.8 }}>Belum ada resupply mission.</div> : null}
        </div>
      </section>
    </main>
  )
}

