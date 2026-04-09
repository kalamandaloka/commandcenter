"use client"

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { apiRequest } from '@/app/lib/api'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

type Scenario = { id: string; name: string }
type ScenarioRun = { id: string; scenarioId: string; simulationStatus: string; simulationSpeed: number; currentPhase: number; createdAt: string }

type LogisticsNode = { id: string; scenarioId: string; name: string; nodeType: string }
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

export default function LogisticsMissionsPage() {
  const router = useRouter()
  const pathname = usePathname()

  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<DemoRole>('logistics')

  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [runs, setRuns] = useState<ScenarioRun[]>([])
  const [nodes, setNodes] = useState<LogisticsNode[]>([])
  const [missions, setMissions] = useState<LogisticsMission[]>([])

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
  const canCreate = role === 'logistics' || role === 'director'

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
      if (!isRoleAllowedForPath(u.role, pathname)) {
        router.replace(getDefaultRouteForRole(u.role))
      }
    }
  }, [router, pathname])

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
    if (!token || !activeScenarioId) return
    apiRequest<LogisticsNode[]>(`/logistics/nodes?scenarioId=${encodeURIComponent(activeScenarioId)}`, { token })
      .then((n) => {
        setNodes(n)
        if (!fromNodeId && n[0]?.id) setFromNodeId(n[0].id)
        if (!toNodeId && n[1]?.id) setToNodeId(n[1].id)
      })
      .catch(() => {})
  }, [token, activeScenarioId, fromNodeId, toNodeId])

  useEffect(() => {
    if (!token || !activeRunId) return
    setLoading(true)
    setError(null)
    apiRequest<LogisticsMission[]>(`/logistics/missions?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token })
      .then(setMissions)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load missions failed'))
      .finally(() => setLoading(false))
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
      setError(e instanceof Error ? e.message : 'Create mission failed')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.replace('/login')
  }

  return (
    <main style={{ padding: 16, display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>Logistics Missions</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {activeScenario ? `Scenario: ${activeScenario.name}` : 'Per run (demo)'} {activeRun ? `• run ${activeRun.id.slice(0, 8)} • phase ${activeRun.currentPhase}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/logistics')} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            Logistics
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
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id.slice(0, 8)} • {r.simulationStatus} • phase {r.currentPhase}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {canCreate ? (
        <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 600 }}>Create Logistics Mission</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <select value={fromNodeId} onChange={(e) => setFromNodeId(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }}>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} • {n.nodeType}
                </option>
              ))}
            </select>
            <select value={toNodeId} onChange={(e) => setToNodeId(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }}>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} • {n.nodeType}
                </option>
              ))}
            </select>
            <select value={transportMode} onChange={(e) => setTransportMode(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }}>
              <option value="ground">ground</option>
              <option value="sea">sea</option>
              <option value="air">air</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
            <input type="number" value={fuelAmount} onChange={(e) => setFuelAmount(Number(e.target.value))} placeholder="fuel" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
            <input type="number" value={ammoAmount} onChange={(e) => setAmmoAmount(Number(e.target.value))} placeholder="ammo" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
            <input type="number" value={rationAmount} onChange={(e) => setRationAmount(Number(e.target.value))} placeholder="ration" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
            <input type="number" value={medicalAmount} onChange={(e) => setMedicalAmount(Number(e.target.value))} placeholder="medical" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
            <input type="number" value={spareAmount} onChange={(e) => setSpareAmount(Number(e.target.value))} placeholder="spare" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
            <input type="number" value={etaMinutes} onChange={(e) => setEtaMinutes(Number(e.target.value))} placeholder="eta" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
          </div>

          <button onClick={createMission} disabled={loading || !activeRunId || !fromNodeId || !toNodeId} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #22c55e', background: '#14532d', color: '#bbf7d0', height: 38, width: 220 }}>
            Create
          </button>
        </section>
      ) : null}

      <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ textAlign: 'left', fontSize: 12, opacity: 0.85 }}>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>From</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>To</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Mode</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Payload</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>ETA</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {missions.map((m) => (
              <tr key={m.id}>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{m.fromNode?.name ?? m.fromNodeId.slice(0, 8)}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{m.toNode?.name ?? m.toNodeId.slice(0, 8)}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{m.transportMode}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827', fontSize: 12, opacity: 0.9 }}>
                  fuel {m.fuelAmount} • ammo {m.ammoAmount} • ration {m.rationAmount} • med {m.medicalAmount} • spare {m.spareAmount}
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{m.etaMinutes}m</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{m.status ?? '-'}</td>
              </tr>
            ))}
            {!missions.length ? (
              <tr>
                <td colSpan={6} style={{ padding: 12, fontSize: 12, opacity: 0.8 }}>
                  Tidak ada logistics mission.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  )
}
