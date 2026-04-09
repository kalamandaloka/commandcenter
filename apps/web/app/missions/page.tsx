"use client"

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { apiRequest } from '@/app/lib/api'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

type ScenarioRun = { id: string; scenarioId: string; simulationStatus: string; simulationSpeed: number; currentPhase: number; createdAt: string }

type MissionUnit = { id: string; assignedRole: string | null; unit: { id: string; code: string; name: string; branch: string; status: string } }
type MissionOrder = { id: string; orderType: string; approvalStatus: string; executionStatus: string; priority: number }

type Mission = {
  id: string
  scenarioRunId: string
  name: string
  missionType: string
  objective: string | null
  priority: number
  phaseNumber: number
  status: string
  createdAt: string
  missionUnits: MissionUnit[]
  orders: MissionOrder[]
}

export default function MissionsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<DemoRole>('operations')

  const [runs, setRuns] = useState<ScenarioRun[]>([])
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [missions, setMissions] = useState<Mission[]>([])

  const [name, setName] = useState('')
  const [missionType, setMissionType] = useState('patrol')
  const [objective, setObjective] = useState('')
  const [priority, setPriority] = useState(3)
  const [phaseNumber, setPhaseNumber] = useState(1)

  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canCreate = role === 'operations' || role === 'director'
  const activeRun = useMemo(() => runs.find((r) => r.id === activeRunId) ?? null, [runs, activeRunId])

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
    apiRequest<ScenarioRun[]>('/scenario-runs', { token })
      .then((r) => {
        setRuns(r)
        setActiveRunId((prev) => prev ?? r[0]?.id ?? null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load runs failed'))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    if (!token || !activeRunId) return
    setLoading(true)
    setError(null)
    apiRequest<Mission[]>(`/missions?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token })
      .then(setMissions)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load missions failed'))
      .finally(() => setLoading(false))
  }, [token, activeRunId])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return missions
    return missions.filter((m) => (m.name ?? '').toLowerCase().includes(query) || (m.missionType ?? '').toLowerCase().includes(query) || (m.status ?? '').toLowerCase().includes(query))
  }, [missions, q])

  async function createMission() {
    if (!token || !activeRunId || !name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const created = await apiRequest<Mission>('/missions', {
        method: 'POST',
        token,
        body: JSON.stringify({
          scenarioRunId: activeRunId,
          name: name.trim(),
          missionType,
          objective: objective.trim() ? objective.trim() : undefined,
          priority,
          phaseNumber
        })
      })
      setMissions((prev) => [created, ...prev])
      setName('')
      setObjective('')
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
          <h1 style={{ margin: 0 }}>Missions</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Per scenario run (demo)</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push(getDefaultRouteForRole(role))} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            Back
          </button>
          <button onClick={logout} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            Logout
          </button>
        </div>
      </header>

      {error ? <div style={{ color: '#fb7185' }}>{error}</div> : null}
      {loading ? <div style={{ opacity: 0.8 }}>Loading...</div> : null}

      <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Scenario Run</div>
            <select
              value={activeRunId ?? ''}
              onChange={(e) => setActiveRunId(e.target.value)}
              style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }}
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id.slice(0, 8)} • {r.simulationStatus} • x{r.simulationSpeed} • phase {r.currentPhase}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Search</div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="name / type / status" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', width: 280, height: 38 }} />
          </div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Active: {activeRun ? `${activeRun.id} • ${activeRun.simulationStatus} • phase ${activeRun.currentPhase}` : '-'} • {filtered.length} missions
        </div>
      </section>

      {canCreate ? (
        <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 600 }}>Create Mission</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="mission name" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
            <select value={missionType} onChange={(e) => setMissionType(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }}>
              <option value="defend">defend</option>
              <option value="patrol">patrol</option>
              <option value="recon">recon</option>
              <option value="escort">escort</option>
              <option value="intercept">intercept</option>
              <option value="transport">transport</option>
              <option value="resupply">resupply</option>
              <option value="reserve">reserve</option>
              <option value="support">support</option>
            </select>
            <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} min={1} max={5} style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
            <input type="number" value={phaseNumber} onChange={(e) => setPhaseNumber(Number(e.target.value))} min={1} style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
          </div>
          <input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="objective (optional)" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
          <button onClick={createMission} disabled={!name.trim() || !activeRunId || loading} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #22c55e', background: '#14532d', color: '#bbf7d0', height: 38, width: 180 }}>
            Create
          </button>
        </section>
      ) : null}

      <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ textAlign: 'left', fontSize: 12, opacity: 0.85 }}>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Name</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Type</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Phase</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Priority</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Status</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Units</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Orders</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>
                  <a href={`/missions/${m.id}`} style={{ color: '#93c5fd', textDecoration: 'none' }}>
                    {m.name}
                  </a>
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{m.missionType}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{m.phaseNumber}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{m.priority}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{m.status}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{m.missionUnits?.length ?? 0}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{m.orders?.length ?? 0}</td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={7} style={{ padding: 12, fontSize: 12, opacity: 0.8 }}>
                  Tidak ada mission.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  )
}
