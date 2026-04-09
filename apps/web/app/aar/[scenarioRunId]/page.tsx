"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { apiRequest } from '@/app/lib/api'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

type ScenarioRun = { id: string; scenarioId: string; simulationStatus: string; simulationSpeed: number; currentPhase: number; createdAt: string; scenario?: { id: string; name: string } }

type AARSummary = {
  run: ScenarioRun | null
  counts: { missions: number; orders: number; threats: number; events: number; decisions: number }
  scores: { objectiveScore: number; coordinationScore: number; logisticsScore: number; responseTimeScore: number }
}

type EventLog = { id: string; eventType: string; title: string; description: string | null; severity: string; occurredAt: string }
type DecisionLog = { id: string; decisionType: string; title: string; description: string | null; createdAt: string; impactSummary: string | null }
type Threat = { id: string; name: string; threatType: string; severity: number; confidence: number; status: string | null; createdAt: string }

type AARReport = {
  id: string
  scenarioRunId: string
  title: string
  summary: string
  objectiveScore: number
  coordinationScore: number
  logisticsScore: number
  responseTimeScore: number
  recommendationsJson: string
  createdAt: string
}

export default function AARDetailPage() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams<{ scenarioRunId: string }>()
  const scenarioRunId = params?.scenarioRunId

  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<DemoRole>('evaluator')

  const [summary, setSummary] = useState<AARSummary | null>(null)
  const [events, setEvents] = useState<EventLog[]>([])
  const [decisions, setDecisions] = useState<DecisionLog[]>([])
  const [threats, setThreats] = useState<Threat[]>([])
  const [report, setReport] = useState<AARReport | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canGenerate = role === 'evaluator' || role === 'director'

  const title = useMemo(() => {
    if (!scenarioRunId) return 'AAR Detail'
    return `AAR Detail • ${scenarioRunId.slice(0, 8)}`
  }, [scenarioRunId])

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
  }, [router, pathname])

  useEffect(() => {
    if (!token || !scenarioRunId) return
    setLoading(true)
    setError(null)
    Promise.all([
      apiRequest<AARSummary>(`/aar/${encodeURIComponent(scenarioRunId)}`, { token }),
      apiRequest<EventLog[]>(`/events?scenarioRunId=${encodeURIComponent(scenarioRunId)}`, { token }),
      apiRequest<DecisionLog[]>(`/decisions?scenarioRunId=${encodeURIComponent(scenarioRunId)}`, { token }),
      apiRequest<Threat[]>(`/threats?scenarioRunId=${encodeURIComponent(scenarioRunId)}`, { token })
    ])
      .then(([s, e, d, t]) => {
        setSummary(s)
        setEvents(e)
        setDecisions(d)
        setThreats(t)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load AAR detail failed'))
      .finally(() => setLoading(false))
  }, [token, scenarioRunId])

  async function generate() {
    if (!token || !scenarioRunId) return
    setLoading(true)
    setError(null)
    try {
      const r = await apiRequest<AARReport>(`/aar/${encodeURIComponent(scenarioRunId)}/generate`, { method: 'POST', token })
      setReport(r)
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
          <h1 style={{ margin: 0 }}>{title}</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{summary?.run?.scenario?.name ? `Scenario: ${summary.run.scenario.name}` : 'Summary + logs (demo)'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/aar')} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            AAR
          </button>
          <button onClick={logout} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            Logout
          </button>
        </div>
      </header>

      {error ? <div style={{ color: '#fb7185' }}>{error}</div> : null}
      {loading ? <div style={{ opacity: 0.8 }}>Loading...</div> : null}

      {summary ? (
        <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <div style={{ fontWeight: 700 }}>Scores</div>
            {canGenerate ? (
              <button onClick={generate} disabled={loading} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #fb7185', background: '#4c0519', color: '#fecdd3', height: 38 }}>
                Generate Report
              </button>
            ) : null}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Objective</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{summary.scores.objectiveScore}</div>
            </div>
            <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Coordination</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{summary.scores.coordinationScore}</div>
            </div>
            <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Logistics</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{summary.scores.logisticsScore}</div>
            </div>
            <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Response</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{summary.scores.responseTimeScore}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            counts: missions {summary.counts.missions} • orders {summary.counts.orders} • threats {summary.counts.threats} • events {summary.counts.events} • decisions {summary.counts.decisions}
          </div>
        </section>
      ) : null}

      {report ? (
        <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 700 }}>{report.title}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Objective</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{report.objectiveScore}</div>
            </div>
            <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Coordination</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{report.coordinationScore}</div>
            </div>
            <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Logistics</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{report.logisticsScore}</div>
            </div>
            <div style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220' }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Response</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{report.responseTimeScore}</div>
            </div>
          </div>
          <pre style={{ margin: 0, padding: 12, borderRadius: 12, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', overflow: 'auto', fontSize: 12 }}>
            {report.recommendationsJson}
          </pre>
        </section>
      ) : null}

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 700 }}>Events</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {events.slice(-20).map((e) => (
              <div key={e.id} style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220', display: 'grid', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontWeight: 700 }}>{e.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{e.severity}</div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{e.eventType}</div>
                {e.description ? <div style={{ fontSize: 12, opacity: 0.85 }}>{e.description}</div> : null}
              </div>
            ))}
            {!events.length ? <div style={{ fontSize: 12, opacity: 0.8 }}>No events.</div> : null}
          </div>
        </div>

        <div style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 700 }}>Decisions</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {decisions.slice(-20).map((d) => (
              <div key={d.id} style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220', display: 'grid', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontWeight: 700 }}>{d.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>{d.decisionType}</div>
                </div>
                {d.description ? <div style={{ fontSize: 12, opacity: 0.85 }}>{d.description}</div> : null}
                {d.impactSummary ? <div style={{ fontSize: 12, opacity: 0.85 }}>impact: {d.impactSummary}</div> : null}
              </div>
            ))}
            {!decisions.length ? <div style={{ fontSize: 12, opacity: 0.8 }}>No decisions.</div> : null}
          </div>
        </div>

        <div style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 700 }}>Threats</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {threats.slice(-20).map((t) => (
              <div key={t.id} style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220', display: 'grid', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    sev {t.severity} • conf {t.confidence}
                  </div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  {t.threatType} • {t.status ?? '-'}
                </div>
              </div>
            ))}
            {!threats.length ? <div style={{ fontSize: 12, opacity: 0.8 }}>No threats.</div> : null}
          </div>
        </div>
      </section>
    </main>
  )
}
