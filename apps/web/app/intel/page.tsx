"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '@/app/lib/api'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

type Scenario = { id: string; name: string }
type ScenarioRun = { id: string; scenarioId: string; simulationStatus: string; simulationSpeed: number; currentPhase: number; createdAt: string }

type Threat = {
  id: string
  scenarioRunId: string
  name: string
  threatType: string
  severity: number
  confidence: number
  xCoord: number
  yCoord: number
  status: string | null
  createdAt: string
}

export default function IntelPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<DemoRole>('intelligence')
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [runs, setRuns] = useState<ScenarioRun[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [threats, setThreats] = useState<Threat[]>([])

  const [name, setName] = useState('Unknown Contact')
  const [threatType, setThreatType] = useState('unknown')
  const [severity, setSeverity] = useState(3)
  const [confidence, setConfidence] = useState(55)
  const [xCoord, setXCoord] = useState(110.8)
  const [yCoord, setYCoord] = useState(-2.2)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const activeScenario = useMemo(() => scenarios.find((s) => s.id === activeScenarioId) ?? null, [scenarios, activeScenarioId])
  const activeRun = useMemo(() => runs.find((r) => r.id === activeRunId) ?? null, [runs, activeRunId])
  const canCreateThreat = role === 'intelligence' || role === 'director'

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
      if (!isRoleAllowedForPath(u.role, '/intel')) {
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
    if (!token || !activeRunId) return
    setError(null)
    apiRequest<Threat[]>(`/threats?scenarioRunId=${encodeURIComponent(activeRunId)}`, { token })
      .then(setThreats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load threats failed'))
  }, [token, activeRunId])

  async function createThreat() {
    if (!token || !activeRunId) return
    setLoading(true)
    setError(null)
    try {
      const created = await apiRequest<Threat>('/threats', {
        method: 'POST',
        token,
        body: JSON.stringify({ scenarioRunId: activeRunId, name, threatType, severity, confidence, xCoord, yCoord })
      })
      setThreats((prev) => [...prev, created])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create threat failed')
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
          <h1 style={{ margin: 0 }}>Intel</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Threat markers (MVP)</div>
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
          Active: {activeScenario?.name ?? '-'} • Run: {activeRun?.id ?? '-'} • Threats: {threats.length}
        </div>
      </section>

      {canCreateThreat ? (
        <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 600 }}>Create Threat</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Type
              <input value={threatType} onChange={(e) => setThreatType(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Severity
              <input value={severity} onChange={(e) => setSeverity(Number(e.target.value))} type="number" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Confidence
              <input value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} type="number" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              X (lng)
              <input value={xCoord} onChange={(e) => setXCoord(Number(e.target.value))} type="number" step="0.0001" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Y (lat)
              <input value={yCoord} onChange={(e) => setYCoord(Number(e.target.value))} type="number" step="0.0001" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }} />
            </label>
            <button
              onClick={createThreat}
              disabled={!activeRunId || loading}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ef4444', background: '#7f1d1d', color: '#fecaca', height: 38, alignSelf: 'end' }}
            >
              Create
            </button>
          </div>
        </section>
      ) : null}

      <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 600 }}>Threat List</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {threats.slice().reverse().map((t) => (
            <div key={t.id} style={{ border: '1px solid #1f2937', borderRadius: 10, padding: 10, background: '#0b1220', display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  {t.threatType} • sev {t.severity} • conf {t.confidence}
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                pos: {t.xCoord.toFixed(3)},{t.yCoord.toFixed(3)} • status: {t.status ?? '-'}
              </div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>{new Date(t.createdAt).toLocaleString()}</div>
            </div>
          ))}
          {!threats.length ? <div style={{ fontSize: 12, opacity: 0.8 }}>Belum ada threat.</div> : null}
        </div>
      </section>
    </main>
  )
}
