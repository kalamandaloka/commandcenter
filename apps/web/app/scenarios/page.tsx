"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/app/lib/api'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

type Scenario = { id: string; name: string; slug: string; totalPhases: number; status: string; description?: string | null; isTemplate?: boolean }
type ScenarioRun = { id: string; scenarioId: string; simulationStatus: string; simulationSpeed: number; currentPhase: number; createdAt: string }

export default function ScenariosPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<DemoRole>('commander')
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [runs, setRuns] = useState<ScenarioRun[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const activeScenario = useMemo(() => scenarios.find((s) => s.id === activeScenarioId) ?? null, [scenarios, activeScenarioId])
  const canCreateRun = role === 'director' || role === 'commander'
  const canManageScenario = role === 'director' || role === 'operations'

  const [createName, setCreateName] = useState('')
  const [createSlug, setCreateSlug] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createTotalPhases, setCreateTotalPhases] = useState(3)
  const [createStatus, setCreateStatus] = useState('active')
  const [createIsTemplate, setCreateIsTemplate] = useState(true)

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
  }, [router])

  function slugify(input: string) {
    const base = input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    return base || `scenario-${Math.random().toString(16).slice(2, 8)}`
  }

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
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    setCreateSlug((prev) => {
      if (prev.trim()) return prev
      if (!createName.trim()) return prev
      return slugify(createName)
    })
  }, [createName])

  async function createRun() {
    if (!token || !activeScenarioId) return
    setLoading(true)
    setError(null)
    try {
      const run = await apiRequest<ScenarioRun>(`/scenarios/${activeScenarioId}/start-run`, { method: 'POST', token })
      setRuns((prev) => [run, ...prev])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create run')
    } finally {
      setLoading(false)
    }
  }

  async function createScenario() {
    if (!token) return
    const name = createName.trim()
    const slug = (createSlug || slugify(name)).trim()
    if (!name || !slug) return
    setLoading(true)
    setError(null)
    try {
      const created = await apiRequest<Scenario>('/scenarios', {
        method: 'POST',
        token,
        body: JSON.stringify({
          name,
          slug,
          description: createDescription.trim() ? createDescription.trim() : undefined,
          totalPhases: Math.max(1, Math.floor(createTotalPhases)),
          status: createStatus,
          isTemplate: createIsTemplate
        })
      })
      setScenarios((prev) => [...prev, created])
      setActiveScenarioId(created.id)
      setCreateName('')
      setCreateSlug('')
      setCreateDescription('')
      setCreateTotalPhases(3)
      setCreateStatus('active')
      setCreateIsTemplate(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create scenario')
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
          <h1 style={{ margin: 0 }}>Scenarios</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>List skenario + buat scenario run</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Scenario</div>
            <select
              value={activeScenarioId ?? ''}
              onChange={(e) => setActiveScenarioId(e.target.value)}
              style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }}
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {activeScenario ? (
              <button
                onClick={() => router.push(`/scenarios/${activeScenario.id}`)}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb', height: 38 }}
              >
                Open Detail
              </button>
            ) : null}
            {canCreateRun ? (
              <button onClick={createRun} disabled={!activeScenario || loading} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #0ea5e9', background: '#0284c7', color: '#e5e7eb', height: 38 }}>
                Create Run
              </button>
            ) : null}
          </div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Active: {activeScenario ? `${activeScenario.name} • phases ${activeScenario.totalPhases}` : '-'}
        </div>
      </section>

      {canManageScenario ? (
        <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 600 }}>Create Scenario</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
            <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="scenario name" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
            <input value={createSlug} onChange={(e) => setCreateSlug(e.target.value)} placeholder="slug" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
            <select value={createStatus} onChange={(e) => setCreateStatus(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="archived">archived</option>
            </select>
          </div>
          <textarea value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} placeholder="description (optional)" rows={3} style={{ padding: 10, borderRadius: 10, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', resize: 'vertical' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, alignItems: 'center' }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Total Phases
              <input type="number" min={1} value={createTotalPhases} onChange={(e) => setCreateTotalPhases(Number(e.target.value))} style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, opacity: 0.9, height: 38 }}>
              <input type="checkbox" checked={createIsTemplate} onChange={(e) => setCreateIsTemplate(e.target.checked)} />
              Template
            </label>
            <button onClick={createScenario} disabled={!createName.trim() || loading} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #22c55e', background: '#14532d', color: '#bbf7d0', height: 38 }}>
              Create
            </button>
          </div>
        </section>
      ) : null}

      <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 600 }}>Scenario List</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {scenarios.map((s) => (
            <div
              key={s.id}
              style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}
            >
              <div style={{ display: 'grid', gap: 3 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{s.slug}</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>phases {s.totalPhases}</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{s.status}</div>
                </div>
              </div>
              <button
                onClick={() => router.push(`/scenarios/${s.id}`)}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb', height: 38 }}
              >
                Open
              </button>
            </div>
          ))}
          {!scenarios.length ? <div style={{ fontSize: 12, opacity: 0.8 }}>Belum ada scenario.</div> : null}
        </div>
      </section>

      <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 600 }}>Scenario Runs</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {runs.map((r) => (
            <div
              key={r.id}
              style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}
            >
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontWeight: 600 }}>{r.id}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  scenarioId: {r.scenarioId} • {r.simulationStatus} • x{r.simulationSpeed} • phase {r.currentPhase}
                </div>
                <div style={{ fontSize: 11, opacity: 0.75 }}>createdAt: {r.createdAt}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => router.push(`/aar/${r.id}`)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb', height: 38 }}
                >
                  AAR Detail
                </button>
                {role === 'director' ? (
                  <button
                    onClick={() => router.push('/director/control')}
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb', height: 38 }}
                  >
                    Open Director
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {!runs.length ? <div style={{ fontSize: 12, opacity: 0.8 }}>Belum ada run.</div> : null}
        </div>
      </section>
    </main>
  )
}

