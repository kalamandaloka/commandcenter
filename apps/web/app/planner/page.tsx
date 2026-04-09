"use client"

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { apiRequest } from '@/app/lib/api'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

type ScenarioRun = { id: string; scenarioId: string; simulationStatus: string; simulationSpeed: number; currentPhase: number; createdAt: string }
type Mission = { id: string; scenarioRunId: string; name: string; missionType: string; objective: string | null; priority: number; phaseNumber: number; status: string; createdAt: string }
type Order = { id: string; scenarioRunId: string; orderType: string; approvalStatus: string; executionStatus: string; priority: number; createdAt: string; missionId: string | null }

export default function PlannerPage() {
  const router = useRouter()
  const pathname = usePathname()

  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<DemoRole>('operations')

  const [runs, setRuns] = useState<ScenarioRun[]>([])
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [missions, setMissions] = useState<Mission[]>([])
  const [orders, setOrders] = useState<Order[]>([])

  const [phaseFilter, setPhaseFilter] = useState<number | 'all'>('all')
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    Promise.all([
      apiRequest<Mission[]>(`/missions?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token }),
      apiRequest<Order[]>(`/orders?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token })
    ])
      .then(([m, o]) => {
        setMissions(m)
        setOrders(o)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load planner data failed'))
      .finally(() => setLoading(false))
  }, [token, activeRunId])

  const phases = useMemo(() => {
    const s = new Set<number>()
    for (const m of missions) s.add(m.phaseNumber)
    const list = Array.from(s).sort((a, b) => a - b)
    return list.length ? list : [1, 2, 3]
  }, [missions])

  const filteredMissions = useMemo(() => {
    const query = q.trim().toLowerCase()
    return missions
      .filter((m) => (phaseFilter === 'all' ? true : m.phaseNumber === phaseFilter))
      .filter((m) => (!query ? true : (m.name ?? '').toLowerCase().includes(query) || (m.missionType ?? '').toLowerCase().includes(query) || (m.status ?? '').toLowerCase().includes(query)))
      .sort((a, b) => a.phaseNumber - b.phaseNumber || b.priority - a.priority || a.createdAt.localeCompare(b.createdAt))
  }, [missions, q, phaseFilter])

  const ordersByMissionId = useMemo(() => {
    const map: Record<string, Order[]> = {}
    for (const o of orders) {
      const k = o.missionId ?? 'unlinked'
      map[k] = map[k] ?? []
      map[k].push(o)
    }
    for (const k of Object.keys(map)) map[k].sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt))
    return map
  }, [orders])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.replace('/login')
  }

  return (
    <main style={{ padding: 16, display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>Planner</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Phasing overview (demo)</div>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'end' }}>
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
            <div style={{ fontSize: 12, opacity: 0.85 }}>Phase</div>
            <select
              value={String(phaseFilter)}
              onChange={(e) => setPhaseFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38, width: 140 }}
            >
              <option value="all">All</option>
              {phases.map((p) => (
                <option key={p} value={String(p)}>
                  Phase {p}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Search</div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="mission name / type / status" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38, width: 280 }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            Current phase: <span style={{ color: '#fb7185', fontWeight: 700 }}>{activeRun?.currentPhase ?? '-'}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {phases.map((p) => {
              const isCurrent = activeRun?.currentPhase === p
              return (
                <div
                  key={p}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: `1px solid ${isCurrent ? '#fb7185' : '#1f2937'}`,
                    background: isCurrent ? '#4c0519' : '#0b1220',
                    color: isCurrent ? '#fecdd3' : '#e5e7eb',
                    fontSize: 12
                  }}
                >
                  Phase {p}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 600 }}>Plan Board</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {filteredMissions.map((m) => {
            const linkedOrders = ordersByMissionId[m.id] ?? []
            const approval = linkedOrders.filter((o) => o.approvalStatus === 'approved').length
            const executed = linkedOrders.filter((o) => o.executionStatus === 'executed').length
            return (
              <div key={m.id} style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0b1220', display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'grid', gap: 2 }}>
                    <div style={{ fontWeight: 700 }}>
                      <a href={`/missions/${m.id}`} style={{ color: '#93c5fd', textDecoration: 'none' }}>
                        {m.name}
                      </a>{' '}
                      <span style={{ fontSize: 12, opacity: 0.85 }}>• {m.missionType}</span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      phase {m.phaseNumber} • prio {m.priority} • status {m.status}
                      {m.objective ? ` • ${m.objective}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, opacity: 0.9 }}>
                    <div>orders {linkedOrders.length}</div>
                    <div style={{ opacity: 0.85 }}>
                      approved {approval} • executed {executed}
                    </div>
                  </div>
                </div>

                {linkedOrders.length ? (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {linkedOrders.slice(0, 3).map((o) => (
                      <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, opacity: 0.9 }}>
                        <div>
                          <span style={{ fontWeight: 700 }}>{o.orderType}</span> • prio {o.priority}
                        </div>
                        <div>
                          {o.approvalStatus}/{o.executionStatus}
                        </div>
                      </div>
                    ))}
                    {linkedOrders.length > 3 ? (
                      <a href={`/orders?run=${activeRunId ?? ''}`} style={{ color: '#93c5fd', textDecoration: 'none', fontSize: 12 }}>
                        View all orders
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.8 }}>No linked orders.</div>
                )}
              </div>
            )
          })}

          {!filteredMissions.length ? <div style={{ fontSize: 12, opacity: 0.8 }}>Tidak ada mission pada filter ini.</div> : null}
        </div>
      </section>
    </main>
  )
}
