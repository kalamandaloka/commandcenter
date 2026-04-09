"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/app/lib/api'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

type ScenarioRun = { id: string; scenarioId: string; simulationStatus: string; simulationSpeed: number; currentPhase: number }
type Mission = { id: string; name: string; missionType: string; status: string }
type Unit = { id: string; code: string; name: string; branch: string; status: string }

type Order = {
  id: string
  scenarioRunId: string
  missionId: string | null
  mission: Mission | null
  unitId: string | null
  unit: Unit | null
  orderType: string
  description: string | null
  issuedByUserId: string | null
  approvedByUserId: string | null
  executedByUserId: string | null
  approvalStatus: string
  executionStatus: string
  priority: number
  dueTime: string | null
  createdAt: string
}

export default function OrdersPage() {
  const router = useRouter()
  const pathname = '/orders'

  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<DemoRole>('operations')

  const [runs, setRuns] = useState<ScenarioRun[]>([])
  const [activeRunId, setActiveRunId] = useState<string | null>(null)

  const [missions, setMissions] = useState<Mission[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [orders, setOrders] = useState<Order[]>([])

  const [orderType, setOrderType] = useState('move')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState(3)
  const [missionId, setMissionId] = useState<string>('')
  const [unitId, setUnitId] = useState<string>('')

  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canCreate = role === 'operations' || role === 'director'
  const canApprove = role === 'commander' || role === 'director'
  const canExecute = role === 'operations' || role === 'director'

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
        const runFromQuery = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('run') : null
        setActiveRunId((prev) => prev ?? runFromQuery ?? r[0]?.id ?? null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load runs failed'))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    if (!token || !activeRunId) return
    setLoading(true)
    setError(null)
    apiRequest<Order[]>(`/orders?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token })
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load orders failed'))
      .finally(() => setLoading(false))
  }, [token, activeRunId])

  useEffect(() => {
    if (!token || !activeRunId) return
    apiRequest<Mission[]>(`/missions?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token })
      .then((m) => {
        setMissions(m)
        setMissionId((prev) => prev || m[0]?.id || '')
      })
      .catch(() => {})
  }, [token, activeRunId])

  useEffect(() => {
    if (!token || !activeRun?.scenarioId) return
    apiRequest<Unit[]>(`/units?scenarioId=${encodeURIComponent(activeRun.scenarioId)}`, { token })
      .then((u) => {
        setUnits(u)
        setUnitId((prev) => prev || u[0]?.id || '')
      })
      .catch(() => {})
  }, [token, activeRun?.scenarioId])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return orders
    return orders.filter((o) => (o.orderType ?? '').toLowerCase().includes(query) || (o.description ?? '').toLowerCase().includes(query) || (o.approvalStatus ?? '').toLowerCase().includes(query) || (o.executionStatus ?? '').toLowerCase().includes(query))
  }, [orders, q])

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
          missionId: missionId || undefined,
          unitId: unitId || undefined,
          orderType,
          description: description.trim() ? description.trim() : undefined,
          priority
        })
      })
      setOrders((prev) => [created, ...prev])
      setDescription('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create order failed')
    } finally {
      setLoading(false)
    }
  }

  async function approveOrder(id: string) {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const updated = await apiRequest<Order>(`/orders/${encodeURIComponent(id)}/approve`, { method: 'POST', token })
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve failed')
    } finally {
      setLoading(false)
    }
  }

  async function executeOrder(id: string) {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const updated = await apiRequest<Order>(`/orders/${encodeURIComponent(id)}/execute`, { method: 'POST', token })
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)))
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

  return (
    <main style={{ padding: 16, display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>Orders</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Create / approve / execute (demo)</div>
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
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="type / status / text" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', width: 280, height: 38 }} />
          </div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Active: {activeRun ? `${activeRun.id} • phase ${activeRun.currentPhase}` : '-'} • {filtered.length} orders
        </div>
      </section>

      {canCreate ? (
        <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 600 }}>Create Order</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            <select value={orderType} onChange={(e) => setOrderType(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }}>
              <option value="move">move</option>
              <option value="attack">attack</option>
              <option value="defend">defend</option>
              <option value="recon">recon</option>
              <option value="support">support</option>
              <option value="resupply">resupply</option>
              <option value="transport">transport</option>
            </select>
            <select value={missionId} onChange={(e) => setMissionId(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }}>
              <option value="">No mission</option>
              {missions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} • {m.status}
                </option>
              ))}
            </select>
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }}>
              <option value="">No unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code} • {u.branch} • {u.status}
                </option>
              ))}
            </select>
            <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} min={1} max={5} style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
          </div>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="description (optional)" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
          <button onClick={createOrder} disabled={!activeRunId || loading} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #22c55e', background: '#14532d', color: '#bbf7d0', height: 38, width: 180 }}>
            Create
          </button>
        </section>
      ) : null}

      <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ textAlign: 'left', fontSize: 12, opacity: 0.85 }}>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Type</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Mission</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Unit</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Priority</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Approval</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Execution</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id}>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>
                  <div style={{ fontWeight: 600 }}>{o.orderType}</div>
                  {o.description ? <div style={{ fontSize: 12, opacity: 0.85 }}>{o.description}</div> : null}
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>
                  {o.mission ? (
                    <a href={`/missions/${o.mission.id}`} style={{ color: '#93c5fd', textDecoration: 'none' }}>
                      {o.mission.name}
                    </a>
                  ) : (
                    <span style={{ fontSize: 12, opacity: 0.75 }}>-</span>
                  )}
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>
                  {o.unit ? (
                    <a href={`/units/${o.unit.id}`} style={{ color: '#93c5fd', textDecoration: 'none' }}>
                      {o.unit.code}
                    </a>
                  ) : (
                    <span style={{ fontSize: 12, opacity: 0.75 }}>-</span>
                  )}
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{o.priority}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{o.approvalStatus}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{o.executionStatus}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {canApprove && o.approvalStatus !== 'approved' ? (
                      <button onClick={() => approveOrder(o.id)} disabled={loading} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #fb7185', background: '#4c0519', color: '#fecdd3' }}>
                        Approve
                      </button>
                    ) : null}
                    {canExecute && o.approvalStatus === 'approved' && o.executionStatus !== 'executed' ? (
                      <button onClick={() => executeOrder(o.id)} disabled={loading} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #38bdf8', background: '#0c4a6e', color: '#bae6fd' }}>
                        Execute
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={7} style={{ padding: 12, fontSize: 12, opacity: 0.8 }}>
                  Tidak ada order.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  )
}
