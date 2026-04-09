"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest, API_BASE_URL } from '@/app/lib/api'
import { OperationalMap, type ThreatForMap, type UnitForMap } from '@/app/dashboard/command/OperationalMap'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

type ScenarioRun = { id: string; scenarioId: string; simulationStatus: string; simulationSpeed: number; currentPhase: number; createdAt: string }
type EventLog = { id: string; eventType: string; title: string; description: string | null; severity: string; occurredAt: string }
type DecisionLog = { id: string; decisionType: string; title: string; description: string | null; createdAt: string; impactSummary: string | null }

export default function ViewerLivePage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<DemoRole>('evaluator')
  const [runs, setRuns] = useState<ScenarioRun[]>([])
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [units, setUnits] = useState<UnitForMap[]>([])
  const [threats, setThreats] = useState<ThreatForMap[]>([])
  const [events, setEvents] = useState<EventLog[]>([])
  const [decisions, setDecisions] = useState<DecisionLog[]>([])
  const [tick, setTick] = useState<string | null>(null)
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
      if (!isRoleAllowedForPath(u.role, '/viewer/live')) {
        router.replace(getDefaultRouteForRole(u.role))
      }
    }
  }, [router])

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
    if (!token || !activeRunId || !activeRun) return
    setError(null)
    Promise.all([
      apiRequest<UnitForMap[]>(`/units?scenarioId=${encodeURIComponent(activeRun.scenarioId)}`, { token }),
      apiRequest<ThreatForMap[]>(`/threats?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token }),
      apiRequest<EventLog[]>(`/events?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token }),
      apiRequest<DecisionLog[]>(`/decisions?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token })
    ])
      .then(([u, t, e, d]) => {
        setUnits(u)
        setThreats(t)
        setEvents(e)
        setDecisions(d)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load data failed'))
  }, [token, activeRunId, activeRun])

  useEffect(() => {
    if (!token) return
    let socket: { disconnect: () => void } | null = null
    try {
      const connect = async () => {
        const mod = await import('socket.io-client')
        socket = mod.io(API_BASE_URL, {
          transports: ['websocket'],
          extraHeaders: { Authorization: `Bearer ${token}` }
        })
        ;(socket as any).on('simulation:tick', (payload: { timestamp?: string }) => setTick(payload.timestamp ?? new Date().toISOString()))
        ;(socket as any).on('units:updated', (payload: { payload?: UnitForMap[] }) => {
          if (payload.payload) setUnits(payload.payload)
        })
        ;(socket as any).on('threats:updated', (payload: { payload?: ThreatForMap[] }) => {
          if (payload.payload) setThreats(payload.payload)
        })
        ;(socket as any).on('injects:triggered', () => {
          if (!activeRunId) return
          apiRequest<EventLog[]>(`/events?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token }).then(setEvents).catch(() => {})
        })
      }
      void connect()
    } catch {
      socket = null
    }

    return () => {
      if (socket) socket.disconnect()
    }
  }, [token, activeRunId])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.replace('/login')
  }

  return (
    <main style={{ padding: 16, display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>Viewer Live</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            API: {API_BASE_URL} • Tick: {tick ?? '-'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={activeRunId ?? ''}
            onChange={(e) => setActiveRunId(e.target.value)}
            style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0f172a', color: '#e5e7eb' }}
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id.slice(0, 8)} • {r.simulationStatus} • x{r.simulationSpeed} • phase {r.currentPhase}
              </option>
            ))}
          </select>
          {role === 'commander' || role === 'evaluator' || role === 'director' ? (
            <button onClick={() => router.push('/aar')} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
              AAR
            </button>
          ) : null}
          <button onClick={logout} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            Logout
          </button>
        </div>
      </header>

      {error ? <div style={{ color: '#fb7185' }}>{error}</div> : null}
      {loading ? <div style={{ opacity: 0.8 }}>Loading...</div> : null}

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 12 }}>
        <div>
          <OperationalMap units={units} threats={threats} />
        </div>
        <aside style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontWeight: 600 }}>Status</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Run: {activeRun?.id ?? '-'}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>State: {activeRun?.simulationStatus ?? '-'}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Speed: x{activeRun?.simulationSpeed ?? '-'}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Phase: {activeRun?.currentPhase ?? '-'}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Units: {units.length} • Threats: {threats.length}</div>
          </div>

          <div style={{ borderTop: '1px solid #1f2937', paddingTop: 10, display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 600 }}>Timeline (Events)</div>
            <div style={{ maxHeight: 250, overflow: 'auto', display: 'grid', gap: 8 }}>
              {events.slice(-60).reverse().map((e) => (
                <div key={e.id} style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220', display: 'grid', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                    <div style={{ fontSize: 11, opacity: 0.75 }}>{new Date(e.occurredAt).toLocaleString()}</div>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{e.eventType}</div>
                  {e.description ? <div style={{ fontSize: 12, opacity: 0.8 }}>{e.description}</div> : null}
                </div>
              ))}
              {!events.length ? <div style={{ fontSize: 12, opacity: 0.8 }}>Belum ada event.</div> : null}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1f2937', paddingTop: 10, display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 600 }}>Decisions</div>
            <div style={{ maxHeight: 190, overflow: 'auto', display: 'grid', gap: 8 }}>
              {decisions.slice(-40).reverse().map((d) => (
                <div key={d.id} style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220', display: 'grid', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                    <div style={{ fontSize: 11, opacity: 0.75 }}>{new Date(d.createdAt).toLocaleString()}</div>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{d.decisionType}</div>
                  {d.impactSummary ? <div style={{ fontSize: 12, opacity: 0.8 }}>{d.impactSummary}</div> : null}
                </div>
              ))}
              {!decisions.length ? <div style={{ fontSize: 12, opacity: 0.8 }}>Belum ada decision log.</div> : null}
            </div>
          </div>
        </aside>
      </section>
    </main>
  )
}
