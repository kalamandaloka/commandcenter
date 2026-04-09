"use client"

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { apiRequest } from '@/app/lib/api'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

type Scenario = { id: string; name: string }
type Unit = {
  id: string
  scenarioId: string
  name: string
  code: string
  branch: string
  unitType: string | null
  category: string | null
  readinessScore: number
  supplyScore: number
  moraleScore: number
  xCoord: number
  yCoord: number
  heading: number | null
  parentCommand: string | null
  status: string
}

export default function UnitsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<DemoRole>('commander')

  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)

  const [branch, setBranch] = useState<string>('all')
  const [q, setQ] = useState<string>('')
  const [units, setUnits] = useState<Unit[]>([])

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const activeScenario = useMemo(() => scenarios.find((s) => s.id === activeScenarioId) ?? null, [scenarios, activeScenarioId])

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
    apiRequest<Scenario[]>('/scenarios', { token })
      .then((s) => {
        setScenarios(s)
        setActiveScenarioId((prev) => prev ?? s[0]?.id ?? null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load scenarios failed'))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    if (!token || !activeScenarioId) return
    setLoading(true)
    setError(null)
    const qs = new URLSearchParams()
    qs.set('scenarioId', activeScenarioId)
    if (branch !== 'all') qs.set('branch', branch)
    apiRequest<Unit[]>(`/units?${qs.toString()}`, { token })
      .then(setUnits)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load units failed'))
      .finally(() => setLoading(false))
  }, [token, activeScenarioId, branch])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return units
    return units.filter((u) => (u.code ?? '').toLowerCase().includes(query) || (u.name ?? '').toLowerCase().includes(query) || (u.status ?? '').toLowerCase().includes(query))
  }, [units, q])

  const branchCounts = useMemo(() => {
    const counts: Record<string, number> = { all: units.length }
    for (const u of units) counts[u.branch] = (counts[u.branch] ?? 0) + 1
    return counts
  }, [units])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.replace('/login')
  }

  return (
    <main style={{ padding: 16, display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>Units</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Listing + detail (demo)</div>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'end' }}>
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
            <div style={{ fontSize: 12, opacity: 0.85 }}>Branch</div>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38 }}>
              <option value="all">All ({branchCounts.all ?? 0})</option>
              <option value="land">Land ({branchCounts.land ?? 0})</option>
              <option value="sea">Sea ({branchCounts.sea ?? 0})</option>
              <option value="air">Air ({branchCounts.air ?? 0})</option>
              <option value="logistics">Logistics ({branchCounts.logistics ?? 0})</option>
            </select>
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Search</div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="code / name / status" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38, width: 260 }} />
          </div>
        </div>

        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Active: {activeScenario?.name ?? '-'} • {filtered.length}/{units.length} units
        </div>
      </section>

      <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ textAlign: 'left', fontSize: 12, opacity: 0.85 }}>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Code</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Name</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Branch</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Status</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Readiness</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Supply</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Pos</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} style={{ borderTop: '1px solid #1f2937' }}>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>
                  <a href={`/units/${u.id}`} style={{ color: '#93c5fd', textDecoration: 'none' }}>
                    {u.code}
                  </a>
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{u.name}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{u.branch}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{u.status}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{u.readinessScore}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{u.supplyScore}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827', fontSize: 12, opacity: 0.9 }}>
                  {u.xCoord.toFixed(3)},{u.yCoord.toFixed(3)}
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={7} style={{ padding: 12, fontSize: 12, opacity: 0.8 }}>
                  Tidak ada unit.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  )
}
