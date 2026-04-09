"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { apiRequest } from '@/app/lib/api'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

type Unit = { id: string; code: string; name: string; branch: string; status: string }
type MissionUnit = { id: string; assignedRole: string | null; unit: Unit }
type MissionOrder = { id: string; orderType: string; approvalStatus: string; executionStatus: string; priority: number; createdAt: string }

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
  updatedAt: string
  missionUnits: MissionUnit[]
  orders: MissionOrder[]
  scenarioRun: { id: string; scenarioId: string; scenario: { id: string; name: string } }
}

type UpdateMissionBody = Partial<{
  name: string
  missionType: string
  objective: string
  priority: number
  phaseNumber: number
  status: string
}>

export default function MissionDetailPage() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<DemoRole>('operations')
  const canEdit = role === 'operations' || role === 'director'

  const [mission, setMission] = useState<Mission | null>(null)
  const [draft, setDraft] = useState<UpdateMissionBody>({})
  const [units, setUnits] = useState<Unit[]>([])
  const [assignUnitId, setAssignUnitId] = useState<string>('')
  const [assignedRole, setAssignedRole] = useState<string>('')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const scenarioId = mission?.scenarioRun?.scenarioId ?? null
  const pageTitle = useMemo(() => (mission ? `${mission.name} • ${mission.missionType}` : 'Mission Detail'), [mission])

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
      if (!isRoleAllowedForPath(u.role, '/missions')) {
        router.replace(getDefaultRouteForRole(u.role))
      }
    }
  }, [router, pathname])

  useEffect(() => {
    if (!token || !id) return
    setLoading(true)
    setError(null)
    apiRequest<Mission>(`/missions/${encodeURIComponent(id)}`, { token })
      .then((m) => {
        setMission(m)
        setDraft({
          name: m.name,
          missionType: m.missionType,
          objective: m.objective ?? '',
          priority: m.priority,
          phaseNumber: m.phaseNumber,
          status: m.status
        })
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load mission failed'))
      .finally(() => setLoading(false))
  }, [token, id])

  useEffect(() => {
    if (!token || !scenarioId) return
    apiRequest<Unit[]>(`/units?scenarioId=${encodeURIComponent(scenarioId)}`, { token })
      .then((u) => {
        setUnits(u)
        setAssignUnitId((prev) => prev || u[0]?.id || '')
      })
      .catch(() => {})
  }, [token, scenarioId])

  async function save() {
    if (!token || !id) return
    setLoading(true)
    setError(null)
    try {
      const updated = await apiRequest<Mission>(`/missions/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          name: draft.name,
          missionType: draft.missionType,
          objective: draft.objective ? String(draft.objective) : null,
          priority: draft.priority === undefined ? undefined : Number(draft.priority),
          phaseNumber: draft.phaseNumber === undefined ? undefined : Number(draft.phaseNumber),
          status: draft.status
        })
      })
      setMission(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  async function assignUnit() {
    if (!token || !id || !assignUnitId) return
    setLoading(true)
    setError(null)
    try {
      const mu = await apiRequest<MissionUnit>(`/missions/${encodeURIComponent(id)}/assign-unit`, {
        method: 'POST',
        token,
        body: JSON.stringify({ unitId: assignUnitId, assignedRole: assignedRole.trim() ? assignedRole.trim() : undefined })
      })
      setMission((prev) => {
        if (!prev) return prev
        const exists = prev.missionUnits?.some((x) => x.unit.id === mu.unit.id) ?? false
        const missionUnits = exists ? prev.missionUnits.map((x) => (x.unit.id === mu.unit.id ? mu : x)) : [mu, ...(prev.missionUnits ?? [])]
        return { ...prev, missionUnits }
      })
      setAssignedRole('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assign failed')
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
          <h1 style={{ margin: 0 }}>{pageTitle}</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {mission ? `Scenario: ${mission.scenarioRun?.scenario?.name ?? '-'} • run ${mission.scenarioRunId.slice(0, 8)} • phase ${mission.phaseNumber}` : 'Loading...'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/missions')} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            Missions
          </button>
          <button onClick={logout} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            Logout
          </button>
        </div>
      </header>

      {error ? <div style={{ color: '#fb7185' }}>{error}</div> : null}
      {loading ? <div style={{ opacity: 0.8 }}>Loading...</div> : null}

      {mission ? (
        <>
          <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                Name
                <input
                  value={String(draft.name ?? '')}
                  onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                  disabled={!canEdit}
                  style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                Type
                <input
                  value={String(draft.missionType ?? '')}
                  onChange={(e) => setDraft((p) => ({ ...p, missionType: e.target.value }))}
                  disabled={!canEdit}
                  style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                Priority
                <input
                  type="number"
                  value={Number(draft.priority ?? 0)}
                  onChange={(e) => setDraft((p) => ({ ...p, priority: Number(e.target.value) }))}
                  disabled={!canEdit}
                  style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
                Phase
                <input
                  type="number"
                  value={Number(draft.phaseNumber ?? 1)}
                  onChange={(e) => setDraft((p) => ({ ...p, phaseNumber: Number(e.target.value) }))}
                  disabled={!canEdit}
                  style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }}
                />
              </label>
            </div>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Objective
              <input
                value={String(draft.objective ?? '')}
                onChange={(e) => setDraft((p) => ({ ...p, objective: e.target.value }))}
                disabled={!canEdit}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }}
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Status: {mission.status}</div>
              {canEdit ? (
                <button onClick={save} disabled={loading} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #22c55e', background: '#14532d', color: '#bbf7d0', height: 38 }}>
                  Save
                </button>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.8 }}>Read-only</div>
              )}
            </div>
          </section>

          {canEdit ? (
            <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 600 }}>Assign Unit</div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 10, alignItems: 'end' }}>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>Unit</div>
                  <select
                    value={assignUnitId}
                    onChange={(e) => setAssignUnitId(e.target.value)}
                    style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }}
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.code} • {u.branch} • {u.status}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>Assigned Role (optional)</div>
                  <input value={assignedRole} onChange={(e) => setAssignedRole(e.target.value)} placeholder="e.g. main / reserve" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
                </div>
                <button onClick={assignUnit} disabled={!assignUnitId || loading} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #22c55e', background: '#14532d', color: '#bbf7d0', height: 38 }}>
                  Assign
                </button>
              </div>
            </section>
          ) : null}

          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 600 }}>Assigned Units</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {(mission.missionUnits ?? []).map((mu) => (
                  <div key={mu.id} style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220', display: 'grid', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ fontWeight: 600 }}>
                        <a href={`/units/${mu.unit.id}`} style={{ color: '#93c5fd', textDecoration: 'none' }}>
                          {mu.unit.code}
                        </a>{' '}
                        • {mu.unit.name}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.85 }}>{mu.unit.branch}</div>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      status {mu.unit.status}
                      {mu.assignedRole ? ` • role ${mu.assignedRole}` : ''}
                    </div>
                  </div>
                ))}
                {!mission.missionUnits?.length ? <div style={{ fontSize: 12, opacity: 0.8 }}>Belum ada unit ter-assign.</div> : null}
              </div>
            </div>

            <div style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 600 }}>Orders</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {(mission.orders ?? []).map((o) => (
                  <div key={o.id} style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220', display: 'grid', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ fontWeight: 600 }}>
                        <a href={`/orders?run=${mission.scenarioRunId}`} style={{ color: '#93c5fd', textDecoration: 'none' }}>
                          {o.orderType}
                        </a>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.85 }}>prio {o.priority}</div>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      approval {o.approvalStatus} • exec {o.executionStatus}
                    </div>
                  </div>
                ))}
                {!mission.orders?.length ? <div style={{ fontSize: 12, opacity: 0.8 }}>Belum ada order.</div> : null}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </main>
  )
}
