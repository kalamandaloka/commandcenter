"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { apiRequest } from '@/app/lib/api'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

type ScenarioPhase = { id: string; phaseNumber: number; name: string; description: string | null; startOffsetMinutes: number; endOffsetMinutes: number }
type Scenario = {
  id: string
  name: string
  slug: string
  totalPhases: number
  status: string
  description?: string | null
  areaName?: string | null
  scenarioType?: string | null
  initialPhase?: number
  isTemplate?: boolean
  phases?: ScenarioPhase[]
}
type ScenarioRun = { id: string; scenarioId: string; simulationStatus: string; simulationSpeed: number; currentPhase: number; createdAt: string }
type Unit = { id: string; code: string; name: string; branch: string; status: string; xCoord: number; yCoord: number }

export default function ScenarioDetailPage() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<DemoRole>('commander')

  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [runs, setRuns] = useState<ScenarioRun[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [q, setQ] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editAreaName, setEditAreaName] = useState('')
  const [editScenarioType, setEditScenarioType] = useState('')
  const [editInitialPhase, setEditInitialPhase] = useState(1)
  const [editTotalPhases, setEditTotalPhases] = useState(1)
  const [editStatus, setEditStatus] = useState('active')
  const [editIsTemplate, setEditIsTemplate] = useState(true)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
      if (!isRoleAllowedForPath(u.role, '/scenarios')) {
        router.replace(getDefaultRouteForRole(u.role))
      }
    }
  }, [router, pathname])

  useEffect(() => {
    if (!token || !id) return
    setLoading(true)
    setError(null)
    Promise.all([apiRequest<Scenario>(`/scenarios/${encodeURIComponent(id)}`, { token }), apiRequest<ScenarioRun[]>('/scenario-runs', { token }), apiRequest<Unit[]>(`/units?scenarioId=${encodeURIComponent(id)}`, { token })])
      .then(([s, r, u]) => {
        setScenario(s)
        setEditName(s.name ?? '')
        setEditSlug(s.slug ?? '')
        setEditDescription((s.description ?? '') as string)
        setEditAreaName((s.areaName ?? '') as string)
        setEditScenarioType((s.scenarioType ?? '') as string)
        setEditInitialPhase(s.initialPhase ?? 1)
        setEditTotalPhases(s.totalPhases ?? 1)
        setEditStatus(s.status ?? 'active')
        setEditIsTemplate(s.isTemplate ?? true)
        setRuns(r.filter((x) => x.scenarioId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
        setUnits(u)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load scenario detail failed'))
      .finally(() => setLoading(false))
  }, [token, id])

  const filteredUnits = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return units
    return units.filter((u) => (u.code ?? '').toLowerCase().includes(query) || (u.name ?? '').toLowerCase().includes(query) || (u.branch ?? '').toLowerCase().includes(query) || (u.status ?? '').toLowerCase().includes(query))
  }, [units, q])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.replace('/login')
  }

  async function saveScenario() {
    if (!token || !id) return
    setLoading(true)
    setError(null)
    try {
      const updated = await apiRequest<Scenario>(`/scenarios/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          name: editName.trim() ? editName.trim() : undefined,
          slug: editSlug.trim() ? editSlug.trim() : undefined,
          description: editDescription.trim() ? editDescription.trim() : undefined,
          areaName: editAreaName.trim() ? editAreaName.trim() : undefined,
          scenarioType: editScenarioType.trim() ? editScenarioType.trim() : undefined,
          initialPhase: Math.max(1, Math.floor(editInitialPhase)),
          totalPhases: Math.max(1, Math.floor(editTotalPhases)),
          status: editStatus,
          isTemplate: editIsTemplate
        })
      })
      setScenario(updated)
      setEditOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: 16, display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>{scenario?.name ?? 'Scenario'}</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{scenario ? `${scenario.slug} • phases ${scenario.totalPhases} • ${scenario.status}` : 'Loading...'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {role === 'director' || role === 'operations' ? (
            <button
              onClick={() => setEditOpen((v) => !v)}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: editOpen ? '#0b1220' : '#0f172a', color: '#e5e7eb' }}
            >
              {editOpen ? 'Close Edit' : 'Edit'}
            </button>
          ) : null}
          <button onClick={() => router.push('/scenarios')} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            Scenarios
          </button>
          <button onClick={logout} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            Logout
          </button>
        </div>
      </header>

      {error ? <div style={{ color: '#fb7185' }}>{error}</div> : null}
      {loading ? <div style={{ opacity: 0.8 }}>Loading...</div> : null}

      {scenario?.description ? (
        <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Description</div>
          <div style={{ fontSize: 12, opacity: 0.9, whiteSpace: 'pre-wrap' }}>{scenario.description}</div>
        </section>
      ) : null}

      {editOpen ? (
        <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 600 }}>Edit Scenario</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="name" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
            <input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} placeholder="slug" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="archived">archived</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input value={editAreaName} onChange={(e) => setEditAreaName(e.target.value)} placeholder="area name (optional)" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
            <input value={editScenarioType} onChange={(e) => setEditScenarioType(e.target.value)} placeholder="scenario type (optional)" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
          </div>
          <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="description (optional)" rows={3} style={{ padding: 10, borderRadius: 10, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', resize: 'vertical' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, alignItems: 'center' }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Initial Phase
              <input type="number" min={1} value={editInitialPhase} onChange={(e) => setEditInitialPhase(Number(e.target.value))} style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Total Phases
              <input type="number" min={1} value={editTotalPhases} onChange={(e) => setEditTotalPhases(Number(e.target.value))} style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', height: 38, fontSize: 12, opacity: 0.9 }}>
              <input type="checkbox" checked={editIsTemplate} onChange={(e) => setEditIsTemplate(e.target.checked)} /> Template
            </label>
            <button onClick={saveScenario} disabled={loading || !editName.trim() || !editSlug.trim()} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #22c55e', background: '#14532d', color: '#bbf7d0', height: 38 }}>
              Save
            </button>
          </div>
        </section>
      ) : null}

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <div style={{ fontWeight: 600 }}>Scenario Runs</div>
            <a href="/scenarios" style={{ color: '#93c5fd', textDecoration: 'none', fontSize: 12 }}>
              Create run
            </a>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {runs.map((r) => (
              <div key={r.id} style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220', display: 'grid', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontWeight: 700 }}>{r.id.slice(0, 8)}</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>phase {r.currentPhase}</div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  {r.simulationStatus} • x{r.simulationSpeed}
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                  <a href={`/aar/${r.id}`} style={{ color: '#93c5fd', textDecoration: 'none' }}>
                    AAR detail
                  </a>
                  <a href={`/orders?run=${r.id}`} style={{ color: '#93c5fd', textDecoration: 'none' }}>
                    Orders
                  </a>
                  <a href="/viewer/live" style={{ color: '#93c5fd', textDecoration: 'none' }}>
                    Live viewer
                  </a>
                </div>
              </div>
            ))}
            {!runs.length ? <div style={{ fontSize: 12, opacity: 0.8 }}>Belum ada run.</div> : null}
          </div>
        </div>

        <div style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'end' }}>
            <div style={{ fontWeight: 600 }}>Units</div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search units" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 34, width: 200 }} />
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {filteredUnits.slice(0, 12).map((u) => (
              <div key={u.id} style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220', display: 'grid', gap: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontWeight: 700 }}>
                    <a href={`/units/${u.id}`} style={{ color: '#93c5fd', textDecoration: 'none' }}>
                      {u.code}
                    </a>{' '}
                    • {u.name}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{u.branch}</div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  {u.status} • {u.xCoord.toFixed(3)},{u.yCoord.toFixed(3)}
                </div>
              </div>
            ))}
            {filteredUnits.length > 12 ? (
              <a href="/units" style={{ color: '#93c5fd', textDecoration: 'none', fontSize: 12 }}>
                View all units
              </a>
            ) : null}
            {!filteredUnits.length ? <div style={{ fontSize: 12, opacity: 0.8 }}>Tidak ada unit.</div> : null}
          </div>
        </div>
      </section>

      {scenario?.phases?.length ? (
        <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 600 }}>Phases</div>
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ textAlign: 'left', fontSize: 12, opacity: 0.85 }}>
                  <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>#</th>
                  <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Name</th>
                  <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Window</th>
                  <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {(scenario.phases ?? []).slice().sort((a, b) => a.phaseNumber - b.phaseNumber).map((p) => (
                  <tr key={p.id}>
                    <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{p.phaseNumber}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid #111827', fontWeight: 700 }}>{p.name}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid #111827', fontSize: 12, opacity: 0.9 }}>
                      {p.startOffsetMinutes}m → {p.endOffsetMinutes}m
                    </td>
                    <td style={{ padding: 10, borderBottom: '1px solid #111827', fontSize: 12, opacity: 0.9 }}>{p.description ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  )
}
