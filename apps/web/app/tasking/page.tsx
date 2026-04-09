"use client"

import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/app/lib/api'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

type Scenario = { id: string; name: string }
type ScenarioRun = { id: string; scenarioId: string; simulationStatus: string; simulationSpeed: number; currentPhase: number; createdAt: string }

type Unit = { id: string; code: string; name: string; branch: string; status: string; xCoord: number; yCoord: number }

type Mission = {
  id: string
  scenarioRunId: string
  name: string
  missionType: string
  objective: string | null
  priority: number
  status: string
  phaseNumber: number
  missionUnits: Array<{ id: string; unitId: string; assignedRole: string | null; unit: Unit }>
}

type Order = {
  id: string
  scenarioRunId: string
  missionId: string | null
  targetUnitId: string | null
  orderType: string
  priority: number
  approvalStatus: string
  executionStatus: string
  issuedAt: string | null
  approvedAt: string | null
  executedAt: string | null
}

function branchAccent(branch: string) {
  switch (branch) {
    case 'land':
      return { fg: '#bbf7d0', bg: 'rgba(34,197,94,0.14)', border: 'rgba(34,197,94,0.35)' }
    case 'sea':
      return { fg: '#bae6fd', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.35)' }
    case 'air':
      return { fg: '#a5f3fc', bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.35)' }
    case 'logistics':
      return { fg: '#fed7aa', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' }
    default:
      return { fg: 'rgba(229,231,235,0.85)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(148,163,184,0.22)' }
  }
}

export default function TaskingPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<DemoRole>('operations')
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [runs, setRuns] = useState<ScenarioRun[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)

  const [units, setUnits] = useState<Unit[]>([])
  const [missions, setMissions] = useState<Mission[]>([])
  const [orders, setOrders] = useState<Order[]>([])

  const [missionName, setMissionName] = useState('Mission Alpha')
  const [missionType, setMissionType] = useState('defense')
  const [missionObjective, setMissionObjective] = useState('Secure key terrain')
  const [missionPriority, setMissionPriority] = useState(3)
  const [missionPhase, setMissionPhase] = useState(1)

  const [selectedMissionId, setSelectedMissionId] = useState<string>('')
  const [assignUnitId, setAssignUnitId] = useState<string>('')
  const [assignRole, setAssignRole] = useState<string>('main')

  const [orderType, setOrderType] = useState('move')
  const [orderPriority, setOrderPriority] = useState(3)
  const [orderTargetUnitId, setOrderTargetUnitId] = useState<string>('')

  const [activeTab, setActiveTab] = useState<'missions' | 'orders'>('missions')
  const [drawerMode, setDrawerMode] = useState<'mission' | 'order' | 'createMission' | 'createOrder'>('mission')
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [bottomTab, setBottomTab] = useState<'approvals' | 'conflicts'>('approvals')

  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState<'all' | 'land' | 'sea' | 'air' | 'logistics'>('all')
  const [unitStatusFilter, setUnitStatusFilter] = useState<'all' | 'active' | 'ready' | 'damaged' | 'offline'>('all')
  const [missionStatusFilter, setMissionStatusFilter] = useState<'all' | 'draft' | 'active' | 'completed' | 'cancelled'>('all')
  const [phaseFilter, setPhaseFilter] = useState<'all' | string>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | string>('all')

  const [dragUnitId, setDragUnitId] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const activeScenario = useMemo(() => scenarios.find((s) => s.id === activeScenarioId) ?? null, [scenarios, activeScenarioId])
  const activeRun = useMemo(() => runs.find((r) => r.id === activeRunId) ?? null, [runs, activeRunId])
  const canEditTasking = role === 'operations' || role === 'commander' || role === 'director'
  const canApprove = role === 'commander' || role === 'director'
  const canExecute = role !== 'evaluator'

  const selectedMission = useMemo(() => missions.find((m) => m.id === selectedMissionId) ?? null, [missions, selectedMissionId])
  const selectedOrder = useMemo(() => orders.find((o) => o.id === selectedOrderId) ?? null, [orders, selectedOrderId])
  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u] as const)), [units])
  const missionById = useMemo(() => new Map(missions.map((m) => [m.id, m] as const)), [missions])
  const ordersByMissionId = useMemo(() => {
    const map = new Map<string, Order[]>()
    for (const o of orders) {
      if (!o.missionId) continue
      const list = map.get(o.missionId) ?? []
      list.push(o)
      map.set(o.missionId, list)
    }
    return map
  }, [orders])
  const ordersForSelectedMission = useMemo(() => (selectedMissionId ? ordersByMissionId.get(selectedMissionId) ?? [] : []), [ordersByMissionId, selectedMissionId])

  const maxPhase = useMemo(() => {
    const fromMissions = missions.reduce((acc, m) => Math.max(acc, m.phaseNumber || 1), 1)
    const fromRun = activeRun?.currentPhase ?? 1
    return Math.max(3, fromMissions, fromRun)
  }, [missions, activeRun])
  const phaseOptions = useMemo(() => Array.from({ length: maxPhase }, (_, i) => String(i + 1)), [maxPhase])

  const filteredUnits = useMemo(() => {
    let list = units
    if (branchFilter !== 'all') list = list.filter((u) => u.branch === branchFilter)
    if (unitStatusFilter !== 'all') list = list.filter((u) => u.status === unitStatusFilter)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((u) => `${u.code} ${u.name} ${u.branch} ${u.status}`.toLowerCase().includes(q))
    return list
  }, [units, branchFilter, unitStatusFilter, search])

  const filteredMissions = useMemo(() => {
    let list = missions
    if (missionStatusFilter !== 'all') list = list.filter((m) => m.status === missionStatusFilter)
    if (phaseFilter !== 'all') list = list.filter((m) => String(m.phaseNumber) === phaseFilter)
    if (priorityFilter !== 'all') list = list.filter((m) => String(m.priority) === priorityFilter)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((m) => `${m.name} ${m.missionType} ${m.objective ?? ''}`.toLowerCase().includes(q))
    return list.slice().sort((a, b) => a.phaseNumber - b.phaseNumber || b.priority - a.priority || a.name.localeCompare(b.name))
  }, [missions, missionStatusFilter, phaseFilter, priorityFilter, search])

  const filteredOrders = useMemo(() => {
    let list = orders
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((o) => `${o.orderType} ${o.approvalStatus} ${o.executionStatus} ${o.id}`.toLowerCase().includes(q))
    return list.slice().sort((a, b) => (b.issuedAt ?? b.id).localeCompare(a.issuedAt ?? a.id))
  }, [orders, search])

  const pendingApprovals = useMemo(() => orders.filter((o) => o.approvalStatus === 'draft'), [orders])

  const conflicts = useMemo(() => {
    const byTarget = new Map<string, Order[]>()
    for (const o of orders) {
      if (!o.targetUnitId) continue
      const list = byTarget.get(o.targetUnitId) ?? []
      list.push(o)
      byTarget.set(o.targetUnitId, list)
    }
    const items: Array<{ targetUnitId: string; orders: Order[] }> = []
    for (const [targetUnitId, list] of byTarget.entries()) {
      const open = list.filter((o) => o.executionStatus !== 'completed' && o.executionStatus !== 'cancelled')
      if (open.length >= 2) items.push({ targetUnitId, orders: open })
    }
    return items.slice().sort((a, b) => b.orders.length - a.orders.length).slice(0, 6)
  }, [orders])

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
      if (!isRoleAllowedForPath(u.role, '/tasking')) {
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
    if (!token || !activeScenarioId) return
    setError(null)
    apiRequest<Unit[]>(`/units?scenarioId=${encodeURIComponent(activeScenarioId)}`, { token })
      .then((u) => {
        setUnits(u)
        if (!assignUnitId && u[0]?.id) setAssignUnitId(u[0].id)
        if (!orderTargetUnitId && u[0]?.id) setOrderTargetUnitId(u[0].id)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load units failed'))
  }, [token, activeScenarioId, assignUnitId, orderTargetUnitId])

  useEffect(() => {
    if (!token || !activeRunId) return
    setError(null)
    Promise.all([
      apiRequest<Mission[]>(`/missions?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token }),
      apiRequest<Order[]>(`/orders?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token })
    ])
      .then(([m, o]) => {
        setMissions(m)
        setOrders(o)
        if (!selectedMissionId && m[0]?.id) setSelectedMissionId(m[0].id)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load tasking failed'))
  }, [token, activeRunId, selectedMissionId])

  async function createMission() {
    if (!token || !activeRunId) return
    setLoading(true)
    setError(null)
    try {
      const created = await apiRequest<Mission>('/missions', {
        method: 'POST',
        token,
        body: JSON.stringify({
          scenarioRunId: activeRunId,
          name: missionName,
          missionType,
          objective: missionObjective,
          priority: missionPriority,
          phaseNumber: missionPhase,
          status: 'draft'
        })
      })
      setMissions((prev) => [created, ...prev])
      setSelectedMissionId(created.id)
      setDrawerMode('mission')
      setDrawerOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create mission failed')
    } finally {
      setLoading(false)
    }
  }

  async function assignUnit() {
    if (!token || !selectedMissionId || !assignUnitId) return
    setLoading(true)
    setError(null)
    try {
      await apiRequest(`/missions/${encodeURIComponent(selectedMissionId)}/assign-unit`, {
        method: 'POST',
        token,
        body: JSON.stringify({ unitId: assignUnitId, assignedRole: assignRole })
      })
      const refreshed = await apiRequest<Mission[]>(`/missions?scenarioRunId=${encodeURIComponent(activeRunId ?? '')}`, { token })
      setMissions(refreshed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assign unit failed')
    } finally {
      setLoading(false)
    }
  }

  async function createOrder() {
    if (!token || !activeRunId) return
    setLoading(true)
    setError(null)
    try {
      const created = await apiRequest<Order>('/orders', {
        method: 'POST',
        token,
        body: JSON.stringify({
          scenarioRunId: activeRunId,
          missionId: selectedMissionId || undefined,
          targetUnitId: orderTargetUnitId || undefined,
          orderType,
          priority: orderPriority,
          detailsJson: JSON.stringify({ note: 'demo order' })
        })
      })
      setOrders((prev) => [created, ...prev])
      setSelectedOrderId(created.id)
      setDrawerMode('order')
      setDrawerOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create order failed')
    } finally {
      setLoading(false)
    }
  }

  async function approveOrder(orderId: string) {
    if (!token || !canApprove) return
    setLoading(true)
    setError(null)
    try {
      const updated = await apiRequest<Order>(`/orders/${encodeURIComponent(orderId)}/approve`, { method: 'POST', token })
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve failed')
    } finally {
      setLoading(false)
    }
  }

  async function executeOrder(orderId: string) {
    if (!token || !canExecute) return
    setLoading(true)
    setError(null)
    try {
      const updated = await apiRequest<Order>(`/orders/${encodeURIComponent(orderId)}/execute`, { method: 'POST', token })
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Execute failed')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.replace('/login')
  }

  function openDrawer(mode: 'mission' | 'order' | 'createMission' | 'createOrder', params?: { missionId?: string; orderId?: string }) {
    if (params?.missionId) setSelectedMissionId(params.missionId)
    if (params?.orderId) setSelectedOrderId(params.orderId)
    setDrawerMode(mode)
    setDrawerOpen(true)
  }

  const baseCard: CSSProperties = { border: '1px solid #1f2937', borderRadius: 12, background: '#0f172a' }
  const panelCard: CSSProperties = { ...baseCard, padding: 12 }
  const subtleCard: CSSProperties = { border: '1px solid #1f2937', borderRadius: 10, background: '#0b1220' }
  const inputStyle: CSSProperties = { padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }
  const selectStyle: CSSProperties = { ...inputStyle }
  const buttonBase: CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb', height: 36 }

  return (
    <main style={{ padding: 12, display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: 12, height: '100vh' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>Tasking</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Operations workspace • missions, orders, approvals</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/dashboard/command')} style={buttonBase}>
            Command
          </button>
          <button onClick={logout} style={buttonBase}>
            Logout
          </button>
        </div>
      </header>

      {error ? <div style={{ color: '#fb7185' }}>{error}</div> : null}
      {loading ? <div style={{ opacity: 0.8 }}>Loading...</div> : null}

      <section style={{ ...panelCard, display: 'grid', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, alignItems: 'end' }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
            Scenario
            <select value={activeScenarioId ?? ''} onChange={(e) => setActiveScenarioId(e.target.value)} style={selectStyle}>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
            Scenario Run
            <select value={activeRunId ?? ''} onChange={(e) => setActiveRunId(e.target.value)} style={selectStyle}>
              {runs
                .filter((r) => (!activeScenarioId ? true : r.scenarioId === activeScenarioId))
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id.slice(0, 8)} • {r.simulationStatus} • x{r.simulationSpeed} • phase {r.currentPhase}
                  </option>
                ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
            Search
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="unit / mission / order..." style={inputStyle} />
          </label>
        </div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Active: {activeScenario?.name ?? '-'} • Run: {activeRun?.id ?? '-'} • Phase {activeRun?.currentPhase ?? '-'} • Units {units.length} • Missions {filteredMissions.length} • Orders {filteredOrders.length}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 12, minHeight: 0 }}>
        <aside style={{ ...panelCard, display: 'grid', gap: 12, minHeight: 0 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Filters</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                  Branch
                  <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value as typeof branchFilter)} style={selectStyle}>
                    <option value="all">all</option>
                    <option value="land">land</option>
                    <option value="sea">sea</option>
                    <option value="air">air</option>
                    <option value="logistics">logistics</option>
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                  Unit status
                  <select value={unitStatusFilter} onChange={(e) => setUnitStatusFilter(e.target.value as typeof unitStatusFilter)} style={selectStyle}>
                    <option value="all">all</option>
                    <option value="active">active</option>
                    <option value="ready">ready</option>
                    <option value="damaged">damaged</option>
                    <option value="offline">offline</option>
                  </select>
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                  Mission status
                  <select value={missionStatusFilter} onChange={(e) => setMissionStatusFilter(e.target.value as typeof missionStatusFilter)} style={selectStyle}>
                    <option value="all">all</option>
                    <option value="draft">draft</option>
                    <option value="active">active</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                  Phase
                  <select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)} style={selectStyle}>
                    <option value="all">all</option>
                    {phaseOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                  Priority
                  <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={selectStyle}>
                    <option value="all">all</option>
                    <option value="5">5</option>
                    <option value="4">4</option>
                    <option value="3">3</option>
                    <option value="2">2</option>
                    <option value="1">1</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Signal</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ ...subtleCard, padding: 10, display: 'grid', gap: 4 }}>
                <div style={{ fontSize: 12, opacity: 0.75 }}>Pending approvals</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{pendingApprovals.length}</div>
              </div>
              <div style={{ ...subtleCard, padding: 10, display: 'grid', gap: 4 }}>
                <div style={{ fontSize: 12, opacity: 0.75 }}>Conflicts</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{conflicts.length}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8, minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Unit pool</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>{filteredUnits.length}</div>
            </div>
            <div style={{ display: 'grid', gap: 8, overflow: 'auto', minHeight: 0 }}>
              {filteredUnits.slice(0, 40).map((u) => {
                const accent = branchAccent(u.branch)
                const selected = assignUnitId === u.id || orderTargetUnitId === u.id
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      setAssignUnitId(u.id)
                      setOrderTargetUnitId((prev) => prev || u.id)
                    }}
                    style={{
                      ...subtleCard,
                      padding: 10,
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderColor: selected ? accent.border : 'rgba(31,41,55,1)',
                      background: selected ? accent.bg : '#0b1220'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ fontWeight: 700, color: accent.fg }}>{u.code}</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        {u.branch} • {u.status}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{u.name}</div>
                  </button>
                )
              })}
              {!filteredUnits.length ? <div style={{ fontSize: 12, opacity: 0.75 }}>No units match current filters.</div> : null}
            </div>
          </div>
        </aside>

        <div style={{ display: 'grid', gridTemplateRows: 'auto auto 1fr auto', gap: 12, minHeight: 0 }}>
          <section style={{ ...panelCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setActiveTab('missions')}
                style={{
                  ...buttonBase,
                  borderColor: activeTab === 'missions' ? '#0ea5e9' : '#334155',
                  background: activeTab === 'missions' ? '#082f49' : '#0f172a',
                  color: '#e5e7eb'
                }}
              >
                Missions
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                style={{
                  ...buttonBase,
                  borderColor: activeTab === 'orders' ? '#f97316' : '#334155',
                  background: activeTab === 'orders' ? '#431407' : '#0f172a',
                  color: '#e5e7eb'
                }}
              >
                Orders
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {canEditTasking ? (
                <>
                  <button
                    onClick={() => openDrawer('createMission')}
                    style={{ ...buttonBase, borderColor: '#22c55e', background: '#14532d', color: '#bbf7d0' }}
                  >
                    New mission
                  </button>
                  <button onClick={() => openDrawer('createOrder')} style={{ ...buttonBase, borderColor: '#f97316', background: '#9a3412', color: '#fed7aa' }}>
                    New order
                  </button>
                </>
              ) : null}
              <button
                onClick={() => setDrawerOpen((v) => !v)}
                style={{ ...buttonBase, borderColor: '#334155', background: drawerOpen ? '#111827' : '#0f172a', color: '#e5e7eb' }}
              >
                {drawerOpen ? 'Hide drawer' : 'Show drawer'}
              </button>
            </div>
          </section>

          <section style={{ ...panelCard, display: 'grid', gap: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontWeight: 700 }}>Phase Planner</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Click a mission to open details</div>
            </div>
            <div style={{ overflow: 'auto' }}>
              <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 260, gap: 10, paddingBottom: 6 }}>
                {phaseOptions.map((p) => {
                  const num = Number(p)
                  const list = filteredMissions.filter((m) => (m.phaseNumber || 1) === num)
                  return (
                    <div key={p} style={{ ...subtleCard, padding: 10, minHeight: 120, display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                        <div style={{ fontWeight: 700 }}>Phase {p}</div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>{list.length}</div>
                      </div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {list.slice(0, 8).map((m) => (
                          <button
                            key={m.id}
                            onClick={() => openDrawer('mission', { missionId: m.id })}
                            style={{
                              border: '1px solid #1f2937',
                              borderRadius: 10,
                              padding: '8px 10px',
                              background: selectedMissionId === m.id ? 'rgba(14,165,233,0.12)' : '#0b1220',
                              color: '#e5e7eb',
                              textAlign: 'left',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                              <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                              <div style={{ fontSize: 12, opacity: 0.75 }}>prio {m.priority}</div>
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                              {m.status} • {m.missionType} • {(m.missionUnits?.length ?? 0)} units
                            </div>
                          </button>
                        ))}
                        {list.length > 8 ? <div style={{ fontSize: 12, opacity: 0.75 }}>+{list.length - 8} more</div> : null}
                        {!list.length ? <div style={{ fontSize: 12, opacity: 0.75 }}>No missions in this phase.</div> : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section style={{ ...panelCard, overflow: 'auto', minHeight: 0 }}>
            {activeTab === 'missions' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#0f172a' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>Phase</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>Prio</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>Units</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMissions.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => openDrawer('mission', { missionId: m.id })}
                      style={{ cursor: 'pointer', background: selectedMissionId === m.id ? 'rgba(14,165,233,0.08)' : 'transparent' }}
                    >
                      <td style={{ padding: '8px', borderBottom: '1px solid #111827', opacity: 0.9 }}>{m.phaseNumber}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #111827', opacity: 0.9 }}>{m.priority}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #111827', opacity: 0.9 }}>{m.status}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #111827' }}>
                        <div style={{ fontWeight: 700 }}>{m.name}</div>
                        <div style={{ opacity: 0.75, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 540 }}>{m.objective ?? '-'}</div>
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #111827', opacity: 0.9 }}>{m.missionType}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #111827', opacity: 0.9 }}>{m.missionUnits?.length ?? 0}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #111827', opacity: 0.9 }}>{ordersByMissionId.get(m.id)?.length ?? 0}</td>
                    </tr>
                  ))}
                  {!filteredMissions.length ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 10, opacity: 0.75 }}>
                        No missions match current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#0f172a' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>Prio</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>Approval</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>Exec</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>Mission</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>Target</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #1f2937' }}>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => {
                    const mission = o.missionId ? missionById.get(o.missionId) : null
                    const target = o.targetUnitId ? unitById.get(o.targetUnitId) : null
                    return (
                      <tr
                        key={o.id}
                        onClick={() => openDrawer('order', { orderId: o.id })}
                        style={{ cursor: 'pointer', background: selectedOrderId === o.id ? 'rgba(249,115,22,0.09)' : 'transparent' }}
                      >
                        <td style={{ padding: '8px', borderBottom: '1px solid #111827', opacity: 0.9 }}>{o.priority}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #111827', opacity: 0.9 }}>{o.orderType}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #111827', opacity: 0.9 }}>{o.approvalStatus}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #111827', opacity: 0.9 }}>{o.executionStatus}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #111827' }}>{mission ? `${mission.name} (P${mission.phaseNumber})` : '-'}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #111827' }}>{target ? `${target.code} • ${target.branch}` : o.targetUnitId ?? '-'}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #111827', opacity: 0.75 }}>{o.id.slice(0, 10)}</td>
                      </tr>
                    )
                  })}
                  {!filteredOrders.length ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 10, opacity: 0.75 }}>
                        No orders match current search.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            )}
          </section>

          <section style={{ ...panelCard, display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setBottomTab('approvals')}
                  style={{
                    ...buttonBase,
                    borderColor: bottomTab === 'approvals' ? '#22c55e' : '#334155',
                    background: bottomTab === 'approvals' ? '#14532d' : '#0f172a',
                    color: '#e5e7eb',
                    height: 34
                  }}
                >
                  Approvals ({pendingApprovals.length})
                </button>
                <button
                  onClick={() => setBottomTab('conflicts')}
                  style={{
                    ...buttonBase,
                    borderColor: bottomTab === 'conflicts' ? '#fb7185' : '#334155',
                    background: bottomTab === 'conflicts' ? 'rgba(190,18,60,0.2)' : '#0f172a',
                    color: '#e5e7eb',
                    height: 34
                  }}
                >
                  Conflicts ({conflicts.length})
                </button>
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>{canApprove ? 'You can approve' : 'View-only'}</div>
            </div>

            {bottomTab === 'approvals' ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {pendingApprovals.slice(0, 8).map((o) => {
                  const mission = o.missionId ? missionById.get(o.missionId) : null
                  const target = o.targetUnitId ? unitById.get(o.targetUnitId) : null
                  return (
                    <div key={o.id} style={{ ...subtleCard, padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <button onClick={() => openDrawer('order', { orderId: o.id })} style={{ background: 'transparent', border: 0, color: '#e5e7eb', textAlign: 'left', cursor: 'pointer', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ fontWeight: 700 }}>
                            {o.orderType} • prio {o.priority}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.75 }}>{o.id.slice(0, 10)}</div>
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                          {mission ? mission.name : 'Unassigned'} • {target ? `${target.code} (${target.branch})` : 'no target'}
                        </div>
                      </button>
                      {canApprove ? (
                        <button onClick={() => approveOrder(o.id)} disabled={loading} style={{ ...buttonBase, borderColor: '#22c55e', background: '#14532d', color: '#bbf7d0', height: 34 }}>
                          Approve
                        </button>
                      ) : null}
                    </div>
                  )
                })}
                {!pendingApprovals.length ? <div style={{ fontSize: 12, opacity: 0.75 }}>No pending approvals.</div> : null}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {conflicts.map((c) => {
                  const target = unitById.get(c.targetUnitId)
                  return (
                    <div key={c.targetUnitId} style={{ ...subtleCard, padding: 10, display: 'grid', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontWeight: 800, color: '#fb7185' }}>
                          Target conflict • {target ? `${target.code} (${target.branch})` : c.targetUnitId}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>{c.orders.length} open orders</div>
                      </div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        {c.orders.slice(0, 4).map((o) => (
                          <button
                            key={o.id}
                            onClick={() => openDrawer('order', { orderId: o.id })}
                            style={{
                              border: '1px solid rgba(251,113,133,0.35)',
                              borderRadius: 10,
                              padding: '8px 10px',
                              background: 'rgba(190,18,60,0.12)',
                              color: '#e5e7eb',
                              textAlign: 'left',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                              <div style={{ fontWeight: 700 }}>
                                {o.orderType} • prio {o.priority}
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.8 }}>
                                {o.approvalStatus} • {o.executionStatus}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {!conflicts.length ? <div style={{ fontSize: 12, opacity: 0.75 }}>No detected conflicts.</div> : null}
              </div>
            )}
          </section>
        </div>
      </section>

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          background: '#0b1220',
          borderLeft: '1px solid #1f2937',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 180ms ease-out',
          zIndex: 30,
          display: 'grid',
          gridTemplateRows: 'auto 1fr'
        }}
      >
        <div style={{ padding: 12, borderBottom: '1px solid #1f2937', background: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'grid', gap: 2 }}>
            <div style={{ fontWeight: 800 }}>Drawer</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {drawerMode === 'mission' && selectedMission ? `Mission • ${selectedMission.name}` : null}
              {drawerMode === 'order' && selectedOrder ? `Order • ${selectedOrder.orderType}` : null}
              {drawerMode === 'createMission' ? 'Create mission' : null}
              {drawerMode === 'createOrder' ? 'Create order' : null}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {drawerMode !== 'createMission' && canEditTasking ? (
              <button onClick={() => openDrawer('createMission')} style={{ ...buttonBase, borderColor: '#22c55e', background: '#14532d', color: '#bbf7d0', height: 34 }}>
                New mission
              </button>
            ) : null}
            {drawerMode !== 'createOrder' && canEditTasking ? (
              <button onClick={() => openDrawer('createOrder')} style={{ ...buttonBase, borderColor: '#f97316', background: '#9a3412', color: '#fed7aa', height: 34 }}>
                New order
              </button>
            ) : null}
            <button onClick={() => setDrawerOpen(false)} style={{ ...buttonBase, height: 34 }}>
              Close
            </button>
          </div>
        </div>

        <div style={{ padding: 12, overflow: 'auto', display: 'grid', gap: 12 }}>
          {drawerMode === 'createMission' ? (
            <div style={{ ...baseCard, padding: 12, display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 800 }}>Create Mission</div>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                Name
                <input value={missionName} onChange={(e) => setMissionName(e.target.value)} style={inputStyle} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                  Type
                  <input value={missionType} onChange={(e) => setMissionType(e.target.value)} style={inputStyle} />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                  Phase
                  <input value={missionPhase} onChange={(e) => setMissionPhase(Number(e.target.value))} type="number" style={inputStyle} />
                </label>
              </div>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                Objective
                <input value={missionObjective} onChange={(e) => setMissionObjective(e.target.value)} style={inputStyle} />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                Priority
                <input value={missionPriority} onChange={(e) => setMissionPriority(Number(e.target.value))} type="number" style={inputStyle} />
              </label>
              <button onClick={createMission} disabled={!activeRunId || loading} style={{ ...buttonBase, borderColor: '#22c55e', background: '#14532d', color: '#bbf7d0', height: 38 }}>
                Create mission
              </button>
            </div>
          ) : null}

          {drawerMode === 'createOrder' ? (
            <div style={{ ...baseCard, padding: 12, display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 800 }}>Create Order</div>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                Mission
                <select value={selectedMissionId} onChange={(e) => setSelectedMissionId(e.target.value)} style={selectStyle}>
                  <option value="">(none)</option>
                  {filteredMissions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} • phase {m.phaseNumber} • prio {m.priority}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                Target unit
                <select value={orderTargetUnitId} onChange={(e) => setOrderTargetUnitId(e.target.value)} style={selectStyle}>
                  <option value="">(none)</option>
                  {filteredUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.code} • {u.branch}/{u.status}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                  Type
                  <input value={orderType} onChange={(e) => setOrderType(e.target.value)} style={inputStyle} />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                  Priority
                  <input value={orderPriority} onChange={(e) => setOrderPriority(Number(e.target.value))} type="number" style={inputStyle} />
                </label>
              </div>
              <button onClick={createOrder} disabled={!activeRunId || loading} style={{ ...buttonBase, borderColor: '#f97316', background: '#9a3412', color: '#fed7aa', height: 38 }}>
                Create order
              </button>
            </div>
          ) : null}

          {drawerMode === 'mission' ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ ...baseCard, padding: 12, display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>{selectedMission ? selectedMission.name : 'No mission selected'}</div>
                  {selectedMission ? (
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      {selectedMission.status} • phase {selectedMission.phaseNumber} • prio {selectedMission.priority}
                    </div>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{selectedMission?.missionType ?? '-'}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{selectedMission?.objective ?? '-'}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Assigned units: {selectedMission?.missionUnits?.length ?? 0}</div>
              </div>

              {canEditTasking ? (
                <div style={{ ...baseCard, padding: 12, display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 800 }}>Assign Unit</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                      Unit
                      <select value={assignUnitId} onChange={(e) => setAssignUnitId(e.target.value)} style={selectStyle}>
                        <option value="">(select)</option>
                        {filteredUnits.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.code} • {u.branch}/{u.status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                      Role
                      <input value={assignRole} onChange={(e) => setAssignRole(e.target.value)} style={inputStyle} />
                    </label>
                  </div>
                  <button onClick={assignUnit} disabled={!selectedMissionId || !assignUnitId || loading} style={{ ...buttonBase, borderColor: '#0ea5e9', background: '#0284c7', color: '#e5e7eb', height: 38 }}>
                    Assign to mission
                  </button>
                </div>
              ) : null}

              <div style={{ ...baseCard, padding: 12, display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 800 }}>Mission Orders</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>{ordersForSelectedMission.length}</div>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {ordersForSelectedMission.slice(0, 8).map((o) => (
                    <button
                      key={o.id}
                      onClick={() => openDrawer('order', { orderId: o.id })}
                      style={{ ...subtleCard, padding: 10, cursor: 'pointer', textAlign: 'left', color: '#e5e7eb' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontWeight: 800 }}>
                          {o.orderType} • prio {o.priority}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          {o.approvalStatus} • {o.executionStatus}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                        Target: {o.targetUnitId ? unitById.get(o.targetUnitId)?.code ?? o.targetUnitId : '-'}
                      </div>
                    </button>
                  ))}
                  {!ordersForSelectedMission.length ? <div style={{ fontSize: 12, opacity: 0.75 }}>No orders for this mission.</div> : null}
                </div>
              </div>

              {canEditTasking ? (
                <div style={{ ...baseCard, padding: 12, display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 800 }}>Quick Create Order</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                      Target unit
                      <select value={orderTargetUnitId} onChange={(e) => setOrderTargetUnitId(e.target.value)} style={selectStyle}>
                        <option value="">(none)</option>
                        {filteredUnits.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.code} • {u.branch}/{u.status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                        Type
                        <input value={orderType} onChange={(e) => setOrderType(e.target.value)} style={inputStyle} />
                      </label>
                      <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                        Priority
                        <input value={orderPriority} onChange={(e) => setOrderPriority(Number(e.target.value))} type="number" style={inputStyle} />
                      </label>
                    </div>
                    <button onClick={createOrder} disabled={!activeRunId || loading} style={{ ...buttonBase, borderColor: '#f97316', background: '#9a3412', color: '#fed7aa', height: 38 }}>
                      Create order for mission
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {drawerMode === 'order' ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ ...baseCard, padding: 12, display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>{selectedOrder ? selectedOrder.orderType : 'No order selected'}</div>
                  {selectedOrder ? (
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      prio {selectedOrder.priority} • {selectedOrder.approvalStatus} • {selectedOrder.executionStatus}
                    </div>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Mission: {selectedOrder?.missionId ? missionById.get(selectedOrder.missionId)?.name ?? selectedOrder.missionId : '-'}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Target: {selectedOrder?.targetUnitId ? unitById.get(selectedOrder.targetUnitId)?.code ?? selectedOrder.targetUnitId : '-'}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>ID: {selectedOrder?.id ?? '-'}</div>
              </div>

              {selectedOrder && (canApprove || canExecute) ? (
                <div style={{ ...baseCard, padding: 12, display: 'grid', gap: 10 }}>
                  <div style={{ fontWeight: 800 }}>Actions</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {canApprove ? (
                      <button
                        onClick={() => approveOrder(selectedOrder.id)}
                        disabled={loading || selectedOrder.approvalStatus === 'approved'}
                        style={{ ...buttonBase, borderColor: '#22c55e', background: '#14532d', color: '#bbf7d0', height: 38 }}
                      >
                        Approve
                      </button>
                    ) : null}
                    {canExecute ? (
                      <button
                        onClick={() => executeOrder(selectedOrder.id)}
                        disabled={loading || selectedOrder.executionStatus === 'executing'}
                        style={{ ...buttonBase, borderColor: '#0ea5e9', background: '#0284c7', color: '#e5e7eb', height: 38 }}
                      >
                        Execute
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
