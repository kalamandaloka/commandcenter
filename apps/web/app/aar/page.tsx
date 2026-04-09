"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/app/lib/api'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

type ScenarioRun = { id: string; scenarioId: string; simulationStatus: string; simulationSpeed: number; currentPhase: number; createdAt: string }
type AARSummary = {
  run: unknown
  counts: { missions: number; orders: number; threats: number; events: number; decisions: number }
  scores: { objectiveScore: number; coordinationScore: number; logisticsScore: number; responseTimeScore: number }
}

export default function AARPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<DemoRole>('evaluator')
  const [runs, setRuns] = useState<ScenarioRun[]>([])
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [summary, setSummary] = useState<AARSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const activeRun = useMemo(() => runs.find((r) => r.id === activeRunId) ?? null, [runs, activeRunId])
  const canGenerate = role === 'evaluator' || role === 'director'

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
      if (!isRoleAllowedForPath(u.role, '/aar')) {
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
    if (!token || !activeRunId) return
    setLoading(true)
    setError(null)
    apiRequest<AARSummary>(`/aar/${encodeURIComponent(activeRunId)}`, { token })
      .then(setSummary)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load AAR failed'))
      .finally(() => setLoading(false))
  }, [token, activeRunId])

  async function generateReport() {
    if (!token || !activeRunId) return
    setLoading(true)
    setError(null)
    try {
      await apiRequest(`/aar/${encodeURIComponent(activeRunId)}/generate`, { method: 'POST', token })
      const s = await apiRequest<AARSummary>(`/aar/${encodeURIComponent(activeRunId)}`, { token })
      setSummary(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generate failed')
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
          <h1 style={{ margin: 0 }}>After Action Review</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Ringkasan run + skor demo</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/viewer/live')} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            Viewer
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
                  {r.id.slice(0, 8)} • {r.simulationStatus} • x{r.simulationSpeed}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {activeRunId ? (
              <button
                onClick={() => router.push(`/aar/${activeRunId}`)}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb', height: 38 }}
              >
                Open Detail
              </button>
            ) : null}
            {canGenerate ? (
              <button
                onClick={generateReport}
                disabled={!activeRunId || loading}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #22c55e', background: '#14532d', color: '#bbf7d0', height: 38 }}
              >
                Generate Report
              </button>
            ) : null}
          </div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Active: {activeRun ? `${activeRun.id} • status ${activeRun.simulationStatus} • phase ${activeRun.currentPhase}` : '-'}
        </div>
      </section>

      <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 600 }}>Summary</div>
        {summary ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Missions</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{summary.counts.missions}</div>
              </div>
              <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Orders</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{summary.counts.orders}</div>
              </div>
              <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Threats</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{summary.counts.threats}</div>
              </div>
              <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Events</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{summary.counts.events}</div>
              </div>
              <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Decisions</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{summary.counts.decisions}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Objective</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{summary.scores.objectiveScore}</div>
              </div>
              <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Coordination</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{summary.scores.coordinationScore}</div>
              </div>
              <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Logistics</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{summary.scores.logisticsScore}</div>
              </div>
              <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Response</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{summary.scores.responseTimeScore}</div>
              </div>
            </div>

            <div style={{ fontSize: 12, opacity: 0.8 }}>run payload: {JSON.stringify(summary.run).slice(0, 380)}...</div>
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.8 }}>Tidak ada data AAR.</div>
        )}
      </section>
    </main>
  )
}

