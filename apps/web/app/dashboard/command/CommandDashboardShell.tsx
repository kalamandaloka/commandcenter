"use client"

import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { apiRequest, API_BASE_URL } from '@/app/lib/api'
import { type ThreatForMap, type UnitForMap } from './OperationalMap'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

type Scenario = { id: string; name: string; slug: string; totalPhases: number }
type ScenarioPhase = { id: string; phaseNumber: number; name: string; description: string | null; startOffsetMinutes: number; endOffsetMinutes: number }
type ScenarioDetail = Scenario & { description?: string | null; areaName?: string | null; scenarioType?: string | null; phases?: ScenarioPhase[] }
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
type Mission = { id: string; scenarioRunId: string; name: string; missionType: string; objective: string | null; priority: number; status: string; phaseNumber: number }
type EventLog = { id: string; scenarioRunId: string; eventType: string; title: string; description: string | null; severity: string; occurredAt: string }
type DecisionLog = { id: string; scenarioRunId: string; decisionType: string; title: string; description: string | null; impactSummary: string | null; createdAt: string }
type Order = {
  id: string
  scenarioRunId: string
  orderType: string
  priority: number
  approvalStatus: string
  executionStatus: string
  detailsJson: string | null
  createdAt: string
  targetUnit?: { id: string; code: string; name: string } | null
  mission?: { id: string; name: string } | null
  issuedBy?: { id: string; name: string; email: string } | null
}

export type DashboardMapProps = {
  units: UnitForMap[]
  threats: ThreatForMap[]
  scenarioId: string | null
  scenarioRunId: string | null
  orders: Order[]
  height: string | number
}

export function CommandDashboardShell({ Map, mapWidth, mapHeight }: { Map: ComponentType<DashboardMapProps>; mapWidth?: number; mapHeight?: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const [token, setToken] = useState<string | null>(null)
  const [userLabel, setUserLabel] = useState<string>('Operator')
  const [role, setRole] = useState<DemoRole>('commander')
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [activeScenarioDetail, setActiveScenarioDetail] = useState<ScenarioDetail | null>(null)
  const [units, setUnits] = useState<UnitForMap[]>([])
  const [threats, setThreats] = useState<ThreatForMap[]>([])
  const [runs, setRuns] = useState<ScenarioRun[]>([])
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [missions, setMissions] = useState<Mission[]>([])
  const [events, setEvents] = useState<EventLog[]>([])
  const [decisions, setDecisions] = useState<DecisionLog[]>([])
  const [tick, setTick] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const activeScenario = useMemo(() => scenarios.find((s) => s.id === activeScenarioId) ?? null, [scenarios, activeScenarioId])
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
      setUserLabel(u.name ?? u.email ?? u.role ?? 'Operator')
      setRole(u.role)
      if (!isRoleAllowedForPath(u.role, pathname)) {
        router.replace(getDefaultRouteForRole(u.role))
      }
    }
  }, [router, pathname])

  useEffect(() => {
    if (!token) return
    setError(null)
    setLoading(true)
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
    if (!token || !activeScenarioId) return
    setError(null)
    apiRequest<UnitForMap[]>(`/units?scenarioId=${encodeURIComponent(activeScenarioId)}`, { token })
      .then(setUnits)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load units failed'))
  }, [token, activeScenarioId])

  useEffect(() => {
    if (!token || !activeScenarioId) return
    setActiveScenarioDetail(null)
    apiRequest<ScenarioDetail>(`/scenarios/${encodeURIComponent(activeScenarioId)}`, { token })
      .then(setActiveScenarioDetail)
      .catch(() => {})
  }, [token, activeScenarioId])

  useEffect(() => {
    if (!token || !activeRunId) return
    setError(null)
    apiRequest<ThreatForMap[]>(`/threats?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token })
      .then(setThreats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load threats failed'))
  }, [token, activeRunId])

  useEffect(() => {
    if (!token || !activeRunId) return
    setError(null)
    apiRequest<Order[]>(`/orders?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token })
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load orders failed'))
  }, [token, activeRunId])

  useEffect(() => {
    if (!token || !activeRunId) return
    setError(null)
    apiRequest<Mission[]>(`/missions?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token })
      .then(setMissions)
      .catch(() => {})
  }, [token, activeRunId])

  useEffect(() => {
    if (!token || !activeRunId) return
    setError(null)
    apiRequest<EventLog[]>(`/events?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token })
      .then(setEvents)
      .catch(() => {})
  }, [token, activeRunId])

  useEffect(() => {
    if (!token || !activeRunId) return
    setError(null)
    apiRequest<DecisionLog[]>(`/decisions?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token })
      .then(setDecisions)
      .catch(() => {})
  }, [token, activeRunId])

  const riskScore = useMemo(() => {
    if (!threats.length) return 0
    const raw = threats.reduce((acc, t) => acc + Math.max(1, t.severity) * Math.max(0, t.confidence) * 0.6, 0)
    return Math.min(100, Math.round(raw / Math.max(1, threats.length)))
  }, [threats])

  const alertLevel = useMemo(() => {
    if (riskScore >= 70) return 'CRITICAL'
    if (riskScore >= 45) return 'ELEVATED'
    if (riskScore >= 20) return 'GUARDED'
    return 'NORMAL'
  }, [riskScore])

  const alertLabel = useMemo(() => {
    if (riskScore >= 70) return 'HIGH'
    if (riskScore >= 45) return 'MEDIUM'
    return 'LOW'
  }, [riskScore])

  const alertColor = useMemo(() => {
    if (riskScore >= 70) return '#fb7185'
    if (riskScore >= 45) return '#f59e0b'
    return '#38bdf8'
  }, [riskScore])

  const branchReadiness = useMemo(() => {
    const branches = ['land', 'sea', 'air', 'logistics'] as const
    return branches.map((b) => {
      const list = units.filter((u) => u.branch === b)
      const avg = (key: 'readinessScore' | 'supplyScore' | 'moraleScore') => {
        if (!list.length) return 0
        const sum = list.reduce((acc, u) => acc + (typeof u[key] === 'number' ? (u[key] as number) : 0), 0)
        return Math.round(sum / list.length)
      }
      return { branch: b, count: list.length, readiness: avg('readinessScore'), supply: avg('supplyScore'), morale: avg('moraleScore') }
    })
  }, [units])

  const topRisks = useMemo(() => {
    return threats
      .slice()
      .sort((a, b) => b.severity * b.confidence - a.severity * a.confidence)
      .slice(0, 5)
  }, [threats])

  const objectiveProgress = useMemo(() => {
    if (!missions.length) return { total: 0, done: 0, active: 0, percent: 0 }
    const done = missions.filter((m) => ['done', 'completed', 'complete', 'success'].includes(m.status)).length
    const active = missions.filter((m) => ['active', 'executing', 'in_progress', 'running'].includes(m.status)).length
    const percent = Math.round((done / Math.max(1, missions.length)) * 100)
    return { total: missions.length, done, active, percent }
  }, [missions])

  const decisionRecommendation = useMemo(() => {
    const air = branchReadiness.find((b) => b.branch === 'air')?.readiness ?? 0
    const sea = branchReadiness.find((b) => b.branch === 'sea')?.readiness ?? 0
    const land = branchReadiness.find((b) => b.branch === 'land')?.readiness ?? 0
    if (riskScore >= 70) {
      if (air >= 70) return { title: 'Prioritaskan ISR udara', body: 'Tingkatkan cakupan sensor. Aktifkan sortie pengintaian dan update threat confidence.', tone: 'danger' as const }
      return { title: 'Konsolidasi & siapkan contingency', body: 'Fokus pada perlindungan OBJ vital dan penyiapan reserve. Turunkan eksposur manuver terbuka.', tone: 'danger' as const }
    }
    if (riskScore >= 45) {
      if (sea >= 70) return { title: 'Perkuat patroli sektor laut', body: 'Geser unsur laut ke sektor prioritas. Pastikan koridor suplai aman.', tone: 'warn' as const }
      if (land >= 70) return { title: 'Perkuat pertahanan darat', body: 'Kunci key terrain & OBJ. Set posture defensive dengan opsi counter-move.', tone: 'warn' as const }
      return { title: 'Review COA & sinkronisasi lintas matra', body: 'Cek konflik tasking. Pastikan order prioritas sudah siap untuk approval.', tone: 'warn' as const }
    }
    return { title: 'Maintain tempo', body: 'Lanjutkan rencana fase berjalan. Monitor perubahan threat & readiness.', tone: 'ok' as const }
  }, [branchReadiness, riskScore])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

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
      }
      void connect()
    } catch {
      socket = null
    }

    return () => {
      if (socket) socket.disconnect()
    }
  }, [token])

  async function createAndStartRun() {
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
      setError(e instanceof Error ? e.message : 'Failed to pause')
    } finally {
      setLoading(false)
    }
  }

  async function setSpeed(speed: number) {
    if (!token || !activeRunId) return
    setLoading(true)
    setError(null)
    try {
      const updated = await apiRequest<ScenarioRun>(`/scenario-runs/${activeRunId}/speed`, { method: 'POST', token, body: JSON.stringify({ speed }) })
      setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set speed')
    } finally {
      setLoading(false)
    }
  }

  async function approveOrder(id: string) {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const updated = await apiRequest<Order>(`/orders/${id}/approve`, { method: 'POST', token })
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve failed')
    } finally {
      setLoading(false)
    }
  }

  async function rejectOrder(id: string) {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const updated = await apiRequest<Order>(`/orders/${id}/reject`, { method: 'POST', token })
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject failed')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.replace('/login')
  }

  const currentPhaseName = useMemo(() => {
    if (!activeRun?.currentPhase) return '-'
    const p = activeScenarioDetail?.phases?.find((pp) => pp.phaseNumber === activeRun.currentPhase)
    return p?.name ?? `PHASE ${activeRun.currentPhase}`
  }, [activeRun?.currentPhase, activeScenarioDetail?.phases])

  const phaseElapsedMs = useMemo(() => {
    const startedAt = activeRun?.startedAt ? new Date(activeRun.startedAt).getTime() : null
    if (!startedAt) return null
    const pausedAt = activeRun?.pausedAt ? new Date(activeRun.pausedAt).getTime() : null
    const endedAt = activeRun?.endedAt ? new Date(activeRun.endedAt).getTime() : null
    const end = endedAt ?? (activeRun?.simulationStatus === 'paused' && pausedAt ? pausedAt : now)
    return Math.max(0, end - startedAt)
  }, [activeRun?.startedAt, activeRun?.pausedAt, activeRun?.endedAt, activeRun?.simulationStatus, now])

  const phaseElapsedLabel = useMemo(() => {
    if (phaseElapsedMs == null) return '--:--:--'
    const total = Math.floor(phaseElapsedMs / 1000)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }, [phaseElapsedMs])

  const commanderStars = useMemo(() => {
    const score = Math.round((objectiveProgress.percent * 0.55 + (100 - riskScore) * 0.25 + (branchReadiness.reduce((a, b) => a + b.readiness, 0) / Math.max(1, branchReadiness.length)) * 0.2) / 20)
    return Math.max(1, Math.min(5, score))
  }, [objectiveProgress.percent, riskScore, branchReadiness])

  const objectives = useMemo(() => {
    const land = branchReadiness.find((b) => b.branch === 'land')?.readiness ?? 0
    const logistics = branchReadiness.find((b) => b.branch === 'logistics')?.supply ?? 0
    const sea = branchReadiness.find((b) => b.branch === 'sea')?.readiness ?? 0
    const secure = Math.max(0, Math.min(100, Math.round(objectiveProgress.percent * 0.8 + sea * 0.2)))
    const supply = Math.max(0, Math.min(100, Math.round(logistics * 0.65 + objectiveProgress.percent * 0.35)))
    const neutralize = Math.max(0, Math.min(100, Math.round((100 - riskScore) * 0.7 + land * 0.3)))
    return [
      { title: 'SECURE CHOKE POINTS', value: secure, sub: 'Sea lanes safeguarding / access control' },
      { title: 'PROTECT SUPPLY ROUTES', value: supply, sub: 'Supply corridor coverage & sustainment' },
      { title: 'NEUTRALIZE HOSTILE FORCES', value: neutralize, sub: 'Counter hostile presence / interdiction' }
    ]
  }, [branchReadiness, objectiveProgress.percent, riskScore])

  const cmdGridStyle: CSSProperties | undefined = useMemo(() => {
    if (!mapWidth && !mapHeight) return undefined
    const style: CSSProperties = { justifyContent: 'center' }
    if (mapWidth) style.gridTemplateColumns = `360px ${mapWidth}px 360px`
    if (mapHeight) style.alignItems = 'start'
    return style
  }, [mapWidth, mapHeight])

  const mapPanelStyle: CSSProperties | undefined = useMemo(() => {
    if (!mapHeight) return undefined
    return { height: mapHeight, minHeight: mapHeight, maxHeight: mapHeight, overflow: 'hidden' }
  }, [mapHeight])

  return (
    <div className="cmd-shell">
      <header className="cmd-topbar">
        <div className="cmd-title">
          <div className="id-flag" />
          <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
            <div className="cmd-title-main">JOINT COMMANDER</div>
            <div className="cmd-title-sub">{activeScenario?.name ?? 'OPERATION'}</div>
            <div className="cmd-title-sub2">{activeScenarioDetail?.areaName ? `AO: ${activeScenarioDetail.areaName}` : `API: ${API_BASE_URL}`}</div>
          </div>
        </div>

        <div className="cmd-top-center">
          <div className="cmd-top-seg">
            <div className="cmd-top-k">CURRENT PHASE</div>
            <div className="cmd-top-v">{phaseElapsedLabel}</div>
            <div className="cmd-top-v2">{currentPhaseName}</div>
          </div>
          <div className="cmd-top-seg">
            <div className="cmd-top-k">SIMULATION SPEED</div>
            <div className="cmd-top-v">x{activeRun?.simulationSpeed ?? '-'}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn" onClick={() => setSpeed(Math.max(1, (activeRun?.simulationSpeed ?? 1) - 1))} disabled={!activeRunId || loading}>
                -
              </button>
              <button className="btn" onClick={() => setSpeed(Math.min(10, (activeRun?.simulationSpeed ?? 1) + 1))} disabled={!activeRunId || loading}>
                +
              </button>
            </div>
          </div>
          <div className="cmd-top-seg" style={{ borderColor: `${alertColor}55` }}>
            <div className="cmd-top-k">ALERT LEVEL</div>
            <div className="cmd-top-v" style={{ color: alertColor }}>
              {alertLabel}
            </div>
            <div className="cmd-top-v2">risk index {riskScore}%</div>
          </div>
        </div>

        <div className="cmd-top-right">
          <div className="cmd-commander">
            <div className="cmd-commander-title">COMMANDER</div>
            <div style={{ fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userLabel}</div>
            <div className="cmd-stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="cmd-star" data-on={i < commanderStars} />
              ))}
            </div>
          </div>

          <select value={activeScenarioId ?? ''} onChange={(e) => setActiveScenarioId(e.target.value)} style={{ minWidth: 220 }}>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select value={activeRunId ?? ''} onChange={(e) => setActiveRunId(e.target.value)} style={{ minWidth: 240 }}>
            {runs
              .filter((r) => (!activeScenarioId ? true : r.scenarioId === activeScenarioId))
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id.slice(0, 8)} • {r.simulationStatus} • phase {r.currentPhase}
                </option>
              ))}
          </select>

          <button onClick={createAndStartRun} disabled={!activeScenario || loading} className="btn btn-primary">
            Start Run
          </button>
          <button onClick={pauseRun} disabled={!activeRunId || loading} className="btn">
            Pause
          </button>
          <button className="btn" onClick={() => router.push('/orders')}>
            Orders
          </button>
          <button className="btn" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {error ? <div className="danger">{error}</div> : null}
      {loading ? <div className="muted">Loading...</div> : null}

      <section className="cmd-grid" style={cmdGridStyle}>
        <aside className="cmd-panel">
          <div className="cmd-panel-inner">
            <div className="cmd-panel-title">
              <span>MAIN OBJECTIVES</span>
              <span className="chip">{objectiveProgress.percent}%</span>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {objectives.map((o) => (
                <div key={o.title} className="cmd-item">
                  <div className="cmd-item-row">
                    <div className="cmd-item-name">{o.title}</div>
                    <div style={{ fontWeight: 900, color: 'rgba(226,232,240,0.9)' }}>{o.value}%</div>
                  </div>
                  <div className="cmd-item-sub">{o.sub}</div>
                  <div className="cmd-bar">
                    <div style={{ width: `${o.value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="cmd-divider" />

            <div className="cmd-panel-title">
              <span>JOINT READINESS</span>
              <span className="chip">{units.length} units</span>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {branchReadiness.map((b) => (
                <div key={b.branch} className="cmd-item">
                  <div className="cmd-item-row">
                    <div className="cmd-item-name" style={{ textTransform: 'uppercase', fontSize: 12 }}>
                      {b.branch} forces
                    </div>
                    <div style={{ fontWeight: 900 }}>{b.readiness}%</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, fontSize: 11, color: 'rgba(226,232,240,0.7)' }}>
                    <div>
                      <div style={{ color: 'rgba(226,232,240,0.55)' }}>Readiness</div>
                      <div style={{ fontWeight: 800 }}>{b.readiness}%</div>
                    </div>
                    <div>
                      <div style={{ color: 'rgba(226,232,240,0.55)' }}>Supply</div>
                      <div style={{ fontWeight: 800 }}>{b.supply}%</div>
                    </div>
                    <div>
                      <div style={{ color: 'rgba(226,232,240,0.55)' }}>Morale</div>
                      <div style={{ fontWeight: 800 }}>{b.morale}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="cmd-divider" />

            <div className="cmd-panel-title">
              <span>PRIORITY DIRECTIVES</span>
              <span className="chip">phase {activeRun?.currentPhase ?? '-'}</span>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {missions
                .slice()
                .sort((a, b) => b.priority - a.priority)
                .slice(0, 3)
                .map((m, idx) => (
                  <div key={m.id} className="cmd-item" style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 10, display: 'grid', placeItems: 'center', border: '1px solid rgba(148, 163, 184, 0.22)', background: 'rgba(255,255,255,0.03)', fontWeight: 900 }}>
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="cmd-item-name">{m.name}</div>
                        <div className="cmd-item-meta">
                          P{m.priority} • phase {m.phaseNumber} • {m.status}
                        </div>
                      </div>
                    </div>
                    <span className="chip" style={{ borderColor: 'rgba(245,158,11,0.55)', color: '#fde68a' }}>
                      P{m.priority}
                    </span>
                  </div>
                ))}
              {!missions.length ? <div className="muted">Belum ada directive.</div> : null}
            </div>
          </div>
        </aside>

        <div className="cmd-panel" style={mapPanelStyle}>
          <div style={{ padding: 10, height: '100%' }}>
            <Map units={units} threats={threats} scenarioId={activeScenarioId} scenarioRunId={activeRunId} orders={orders} height={'100%'} />
          </div>
        </div>

        <aside className="cmd-panel">
          <div className="cmd-panel-inner">
            <div className="cmd-panel-title">
              <span>TOP RISK</span>
              <span className="chip" style={{ borderColor: `${alertColor}55`, color: alertColor }}>
                {alertLabel}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div className="cmd-gauge" style={{ background: `conic-gradient(${alertColor} 0 ${riskScore}%, rgba(148,163,184,0.18) 0 100%)` }}>
                <div className="cmd-gauge-inner">
                  <div style={{ display: 'grid', placeItems: 'center' }}>
                    <div className="cmd-gauge-num" style={{ color: alertColor }}>
                      {riskScore}
                    </div>
                    <div className="cmd-gauge-sub">RISK SCORE</div>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 8 }}>
                {topRisks.slice(0, 3).map((t) => (
                  <div key={t.id} className="cmd-item" style={{ padding: 10 }}>
                    <div className="cmd-item-row">
                      <div className="cmd-item-name">{t.name}</div>
                      <span className="chip chip-red">sev {t.severity}</span>
                    </div>
                    <div className="cmd-item-sub">{t.threatType}</div>
                    <div className="cmd-item-meta">confidence {t.confidence}</div>
                  </div>
                ))}
                {!topRisks.length ? <div className="muted">Tidak ada threat.</div> : null}
              </div>
            </div>

            <div className="cmd-divider" />

            <div className="cmd-panel-title">
              <span>ACTIVE DECISIONS</span>
              <span className="chip">{decisions.length}</span>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {decisions
                .slice()
                .reverse()
                .slice(0, 3)
                .map((d) => (
                  <div key={d.id} className="cmd-item">
                    <div className="cmd-item-row">
                      <div className="cmd-item-name">{d.title}</div>
                      <span className="chip" style={{ borderColor: 'rgba(245,158,11,0.55)', color: '#fde68a' }}>
                        {d.decisionType}
                      </span>
                    </div>
                    <div className="cmd-item-sub">{d.impactSummary ?? d.description ?? '-'}</div>
                  </div>
                ))}
              {!decisions.length ? <div className="muted">Belum ada keputusan.</div> : null}
            </div>

            <div className="cmd-divider" />

            <div className="cmd-panel-title">
              <span>ACTIVE DECISIONS (APPROVALS)</span>
              <span className="chip">{orders.filter((o) => o.approvalStatus === 'draft').length}</span>
            </div>
            {role === 'commander' || role === 'flatpanel' || role === 'director' ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {orders
                  .filter((o) => o.approvalStatus === 'draft')
                  .slice(0, 3)
                  .map((o) => (
                    <div key={o.id} className="cmd-item">
                      <div className="cmd-item-row">
                        <div className="cmd-item-name">{o.orderType}</div>
                        <span className="chip chip-red">DRAFT</span>
                      </div>
                      <div className="cmd-item-sub">
                        Target: {o.targetUnit?.code ?? '-'} {o.targetUnit?.name ? `• ${o.targetUnit?.name}` : ''}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" onClick={() => approveOrder(o.id)} disabled={loading}>
                          Approve
                        </button>
                        <button className="btn" onClick={() => rejectOrder(o.id)} disabled={loading}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                {!orders.some((o) => o.approvalStatus === 'draft') ? <div className="muted">Tidak ada order menunggu approval.</div> : null}
              </div>
            ) : (
              <div className="muted">Read-only</div>
            )}
          </div>
        </aside>
      </section>

      <section className="cmd-bottom">
        <div className="cmd-panel">
          <div className="cmd-panel-inner">
            <div className="cmd-panel-title">
              <span>RECENT EVENTS</span>
              <span className="chip">tick {tick ? new Date(tick).toLocaleTimeString() : '-'}</span>
            </div>
            <div className="cmd-events">
              {events
                .slice()
                .reverse()
                .slice(0, 3)
                .map((e) => (
                  <div key={e.id} className="cmd-item">
                    <div className="cmd-item-row">
                      <div className="cmd-item-name">{e.title}</div>
                      <span className="chip">{new Date(e.occurredAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="cmd-item-sub">{e.description ?? e.eventType}</div>
                    <div className="cmd-item-meta">{e.severity}</div>
                  </div>
                ))}
              {!events.length ? <div className="muted">Belum ada event.</div> : null}
            </div>
            <div className="cmd-divider" />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span className="chip">Units: {units.length}</span>
              <span className="chip chip-red">Threats: {threats.length}</span>
              <span className="chip" style={{ borderColor: 'rgba(245,158,11,0.55)', color: '#fde68a' }}>
                Missions: {missions.length}
              </span>
              <span className="chip">Orders: {orders.length}</span>
            </div>
          </div>
        </div>

        <div className="cmd-panel">
          <div className="cmd-panel-inner">
            <div className="cmd-panel-title">
              <span>COMMAND RECOMMENDATION</span>
              <span
                className="chip"
                style={{
                  borderColor:
                    decisionRecommendation.tone === 'danger'
                      ? 'rgba(251,113,133,0.55)'
                      : decisionRecommendation.tone === 'warn'
                        ? 'rgba(245,158,11,0.55)'
                        : 'rgba(56,189,248,0.45)',
                  color: decisionRecommendation.tone === 'danger' ? '#fecdd3' : decisionRecommendation.tone === 'warn' ? '#fde68a' : '#bae6fd'
                }}
              >
                {decisionRecommendation.tone.toUpperCase()}
              </span>
            </div>
            <div
              className="cmd-item"
              style={{
                borderColor:
                  decisionRecommendation.tone === 'danger'
                    ? 'rgba(251,113,133,0.45)'
                    : decisionRecommendation.tone === 'warn'
                      ? 'rgba(245,158,11,0.45)'
                      : 'rgba(56,189,248,0.35)'
              }}
            >
              <div className="cmd-item-name">{decisionRecommendation.title}</div>
              <div className="cmd-item-sub" style={{ whiteSpace: 'normal' }}>
                {decisionRecommendation.body}
              </div>
              <div className="cmd-item-meta">
                phase {activeRun?.currentPhase ?? '-'} • speed x{activeRun?.simulationSpeed ?? '-'}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
