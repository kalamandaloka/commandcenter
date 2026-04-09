"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/app/lib/api'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

type Scenario = { id: string; name: string; slug: string }
type ScenarioRun = { id: string; scenarioId: string; simulationStatus: string; simulationSpeed: number; currentPhase: number; createdAt: string }
type Inject = { id: string; scenarioId: string; name: string; injectType: string; triggerType: string; triggerOffsetMinutes: number | null; description: string | null; isEnabled: boolean }

export default function InjectsPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<DemoRole>('director')
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [runs, setRuns] = useState<ScenarioRun[]>([])
  const [injects, setInjects] = useState<Inject[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
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
      setRole(u.role)
      if (!isRoleAllowedForPath(u.role, '/injects')) {
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
    apiRequest<Inject[]>(`/injects?scenarioId=${encodeURIComponent(activeScenarioId)}`, { token })
      .then(setInjects)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load injects failed'))
  }, [token, activeScenarioId])

  async function triggerInject(injectId: string) {
    if (!token || !activeRunId) return
    setLoading(true)
    setError(null)
    try {
      await apiRequest(`/injects/${injectId}/trigger`, { method: 'POST', token, body: JSON.stringify({ scenarioRunId: activeRunId }) })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to trigger inject')
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
          <h1 style={{ margin: 0 }}>Injects</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Manual trigger event inject (Director)</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/director/control')} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            Director
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
              {runs
                .filter((r) => (!activeScenarioId ? true : r.scenarioId === activeScenarioId))
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id.slice(0, 8)} • {r.simulationStatus} • x{r.simulationSpeed}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Active: {activeScenario?.name ?? '-'} • Run: {activeRun?.id ?? '-'}
        </div>
      </section>

      <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 600 }}>Daftar Inject</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {injects.map((inj) => (
            <div key={inj.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, padding: 10, borderRadius: 10, border: '1px solid #1f2937', background: '#0b1220' }}>
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontWeight: 600 }}>
                  {inj.name}{' '}
                  <span style={{ opacity: 0.75, fontWeight: 500 }}>
                    ({inj.injectType}) {inj.isEnabled ? '' : 'disabled'}
                  </span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{inj.description ?? '-'}</div>
                <div style={{ fontSize: 11, opacity: 0.75 }}>
                  Trigger: {inj.triggerType}
                  {inj.triggerOffsetMinutes != null ? ` +${inj.triggerOffsetMinutes}m` : ''}
                </div>
              </div>
              <button
                onClick={() => triggerInject(inj.id)}
                disabled={!activeRunId || loading || !inj.isEnabled}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #f97316', background: '#9a3412', color: '#fed7aa', height: 38 }}
              >
                Trigger
              </button>
            </div>
          ))}
          {!injects.length ? <div style={{ fontSize: 12, opacity: 0.8 }}>Tidak ada inject untuk scenario ini.</div> : null}
        </div>
      </section>
    </main>
  )
}

