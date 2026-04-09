"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest, API_BASE_URL } from '@/app/lib/api'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

type Scenario = { id: string; name: string; slug: string; totalPhases: number }
type ScenarioRun = {
  id: string
  scenarioId: string
  simulationStatus: string
  simulationSpeed: number
  currentPhase: number
  createdAt: string
  startedAt?: string | null
  pausedAt?: string | null
  endedAt?: string | null
}
type Inject = { id: string; scenarioId: string; name: string; injectType: string; triggerType: string; triggerOffsetMinutes: number | null; description: string | null; isEnabled?: boolean }
type EventLog = { id: string; eventType: string; sourceId: string | null; occurredAt: string }

export default function DirectorControlPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<DemoRole>('director')
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [runs, setRuns] = useState<ScenarioRun[]>([])
  const [injects, setInjects] = useState<Inject[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [tick, setTick] = useState<string | null>(null)
  const [autoInjectEnabled, setAutoInjectEnabled] = useState(false)
  const [triggeredCount, setTriggeredCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const activeScenario = useMemo(() => scenarios.find((s) => s.id === activeScenarioId) ?? null, [scenarios, activeScenarioId])
  const activeRun = useMemo(() => runs.find((r) => r.id === activeRunId) ?? null, [runs, activeRunId])
  const triggeredInjectIdsRef = useRef<Set<string>>(new Set())
  const autoInjectInFlightRef = useRef<Set<string>>(new Set())

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
      if (!isRoleAllowedForPath(u.role, '/director/control')) {
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
        const firstScenarioId = s[0]?.id ?? null
        setActiveScenarioId((prev) => prev ?? firstScenarioId)
        const firstRunId = r[0]?.id ?? null
        setActiveRunId((prev) => prev ?? firstRunId)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    if (!activeRunId) return
    const key = `autoInject:${activeRunId}`
    const raw = localStorage.getItem(key)
    setAutoInjectEnabled(raw === '1')
  }, [activeRunId])

  useEffect(() => {
    if (!activeRunId) return
    const key = `autoInject:${activeRunId}`
    localStorage.setItem(key, autoInjectEnabled ? '1' : '0')
  }, [activeRunId, autoInjectEnabled])

  useEffect(() => {
    if (!token || !activeScenarioId) return
    setError(null)
    apiRequest<Inject[]>(`/injects?scenarioId=${encodeURIComponent(activeScenarioId)}`, { token })
      .then(setInjects)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load injects failed'))
  }, [token, activeScenarioId])

  useEffect(() => {
    if (!token || !activeRunId) return
    triggeredInjectIdsRef.current = new Set()
    autoInjectInFlightRef.current = new Set()
    apiRequest<EventLog[]>(`/events?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token })
      .then((events) => {
        const triggered = events.filter((e) => e.eventType === 'inject_triggered' && e.sourceId)
        triggeredInjectIdsRef.current = new Set(triggered.map((e) => e.sourceId!).filter(Boolean))
        setTriggeredCount(triggeredInjectIdsRef.current.size)
      })
      .catch(() => {})
  }, [token, activeRunId])

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
        ;(socket as any).on('simulation:tick', (payload: { scenarioRunId?: string; timestamp?: string }) => {
          if (activeRunId && payload.scenarioRunId && payload.scenarioRunId !== activeRunId) return
          setTick(payload.timestamp ?? new Date().toISOString())
        })
        ;(socket as any).on('scenarioRun:updated', (payload: { payload?: ScenarioRun }) => {
          if (!payload.payload) return
          setRuns((prev) => prev.map((r) => (r.id === payload.payload!.id ? { ...r, ...payload.payload } : r)))
        })
        ;(socket as any).on('injects:triggered', () => {
          if (!activeRunId) return
          apiRequest<EventLog[]>(`/events?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token })
            .then((events) => {
              const triggered = events.filter((e) => e.eventType === 'inject_triggered' && e.sourceId)
              triggeredInjectIdsRef.current = new Set(triggered.map((e) => e.sourceId!).filter(Boolean))
              setTriggeredCount(triggeredInjectIdsRef.current.size)
            })
            .catch(() => {})
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

  async function startRun() {
    if (!token || !activeScenarioId) return
    setLoading(true)
    setError(null)
    try {
      const run = await apiRequest<ScenarioRun>(`/scenarios/${activeScenarioId}/start-run`, { method: 'POST', token })
      const started = await apiRequest<ScenarioRun>(`/scenario-runs/${run.id}/start`, { method: 'POST', token })
      setRuns((prev) => [started, ...prev])
      setActiveRunId(started.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start run')
    } finally {
      setLoading(false)
    }
  }

  async function pauseRun() {
    if (!token || !activeRunId) return
    setLoading(true)
    setError(null)
    try {
      const updated = await apiRequest<ScenarioRun>(`/scenario-runs/${activeRunId}/pause`, { method: 'POST', token })
      setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to pause run')
    } finally {
      setLoading(false)
    }
  }

  async function resetRun() {
    if (!token || !activeRunId) return
    setLoading(true)
    setError(null)
    try {
      const updated = await apiRequest<ScenarioRun>(`/scenario-runs/${activeRunId}/reset`, { method: 'POST', token })
      setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      triggeredInjectIdsRef.current = new Set()
      autoInjectInFlightRef.current = new Set()
      localStorage.removeItem(`autoInject:${activeRunId}`)
      setAutoInjectEnabled(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset run')
    } finally {
      setLoading(false)
    }
  }

  async function setSpeed(speed: number) {
    if (!token || !activeRunId) return
    setLoading(true)
    setError(null)
    try {
      const updated = await apiRequest<ScenarioRun>(`/scenario-runs/${activeRunId}/speed`, {
        method: 'POST',
        token,
        body: JSON.stringify({ speed })
      })
      setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set speed')
    } finally {
      setLoading(false)
    }
  }

  const triggerInjectAuto = useCallback(async (injectId: string) => {
    if (!token || !activeRunId) return
    if (autoInjectInFlightRef.current.has(injectId)) return
    autoInjectInFlightRef.current.add(injectId)
    try {
      await apiRequest(`/injects/${injectId}/trigger`, { method: 'POST', token, body: JSON.stringify({ scenarioRunId: activeRunId }) })
      triggeredInjectIdsRef.current.add(injectId)
      setTriggeredCount(triggeredInjectIdsRef.current.size)
    } catch {
    } finally {
      autoInjectInFlightRef.current.delete(injectId)
    }
  }, [token, activeRunId])

  async function triggerInject(injectId: string) {
    if (!token || !activeRunId) return
    setLoading(true)
    setError(null)
    try {
      await apiRequest(`/injects/${injectId}/trigger`, { method: 'POST', token, body: JSON.stringify({ scenarioRunId: activeRunId }) })
      triggeredInjectIdsRef.current.add(injectId)
      setTriggeredCount(triggeredInjectIdsRef.current.size)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to trigger inject')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token || !activeRunId || !activeRun) return
    if (!autoInjectEnabled) return
    if (activeRun.simulationStatus !== 'running') return
    const now = tick ? new Date(tick) : new Date()
    const startAt = activeRun.startedAt ? new Date(activeRun.startedAt) : new Date(activeRun.createdAt)
    const elapsedMinutes = Math.max(0, (now.getTime() - startAt.getTime()) / 60000)
    const scheduled = injects
      .filter((i) => i.triggerType === 'scheduled')
      .filter((i) => (i.isEnabled ?? true) === true)
      .slice()
      .sort((a, b) => (a.triggerOffsetMinutes ?? 0) - (b.triggerOffsetMinutes ?? 0))

    for (const inj of scheduled) {
      const offset = inj.triggerOffsetMinutes ?? 0
      if (offset > elapsedMinutes) continue
      if (triggeredInjectIdsRef.current.has(inj.id)) continue
      void triggerInjectAuto(inj.id)
    }
  }, [token, activeRunId, activeRun, autoInjectEnabled, tick, injects, triggerInjectAuto])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.replace('/login')
  }

  return (
    <main style={{ padding: 16, display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>Director Control</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Scenario • Run • Speed • Injects • Tick: {tick ?? '-'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id.slice(0, 8)} • {r.simulationStatus} • x{r.simulationSpeed} • phase {r.currentPhase}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={startRun} disabled={!activeScenario || loading} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #0ea5e9', background: '#0284c7', color: '#e5e7eb' }}>
            Start Run
          </button>
          <button onClick={pauseRun} disabled={!activeRunId || loading} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#e5e7eb' }}>
            Pause
          </button>
          <button onClick={resetRun} disabled={!activeRunId || loading} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #fb7185', background: '#4c0519', color: '#fecdd3' }}>
            Reset
          </button>
          <button onClick={() => setSpeed(1)} disabled={!activeRunId || loading} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#e5e7eb' }}>
            Speed x1
          </button>
          <button onClick={() => setSpeed(2)} disabled={!activeRunId || loading} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#e5e7eb' }}>
            Speed x2
          </button>
          <button onClick={() => setSpeed(4)} disabled={!activeRunId || loading} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#e5e7eb' }}>
            Speed x4
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#e5e7eb', fontSize: 12 }}>
            <input type="checkbox" checked={autoInjectEnabled} onChange={(e) => setAutoInjectEnabled(e.target.checked)} />
            Auto Inject ({triggeredCount})
          </label>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontWeight: 600 }}>Injects</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{activeScenario ? activeScenario.name : '-'}</div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {injects.map((inj) => (
              <div key={inj.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, padding: 10, borderRadius: 10, border: '1px solid #1f2937', background: '#0b1220' }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ fontWeight: 600 }}>
                    {inj.name} <span style={{ opacity: 0.75, fontWeight: 500 }}>({inj.injectType})</span>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{inj.description ?? '-'}</div>
                  <div style={{ fontSize: 11, opacity: 0.75 }}>
                    Trigger: {inj.triggerType}
                    {inj.triggerOffsetMinutes != null ? ` +${inj.triggerOffsetMinutes}m` : ''}
                    {triggeredInjectIdsRef.current.has(inj.id) ? ' • triggered' : ''}
                  </div>
                </div>
                <button
                  onClick={() => triggerInject(inj.id)}
                  disabled={!activeRunId || loading}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #f97316', background: '#9a3412', color: '#fed7aa', height: 38 }}
                >
                  Trigger
                </button>
              </div>
            ))}
            {!injects.length ? <div style={{ fontSize: 12, opacity: 0.8 }}>Tidak ada inject untuk scenario ini.</div> : null}
          </div>
        </div>
      </section>
    </main>
  )
}
