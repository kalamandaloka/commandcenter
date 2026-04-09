"use client"

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { apiRequest } from '@/app/lib/api'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

type Scenario = { id: string; name: string }

type LogisticsNode = {
  id: string
  scenarioId: string
  name: string
  nodeType: string
  xCoord: number
  yCoord: number
  status: string | null
  fuelStock: number
  ammoStock: number
  rationStock: number
  medicalStock: number
  spareStock: number
}

export default function LogisticsNodesPage() {
  const router = useRouter()
  const pathname = usePathname()

  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<DemoRole>('logistics')

  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)
  const [nodes, setNodes] = useState<LogisticsNode[]>([])
  const [q, setQ] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const activeScenario = useMemo(() => scenarios.find((s) => s.id === activeScenarioId) ?? null, [scenarios, activeScenarioId])
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return nodes
    return nodes.filter((n) => (n.name ?? '').toLowerCase().includes(query) || (n.nodeType ?? '').toLowerCase().includes(query) || (n.status ?? '').toLowerCase().includes(query))
  }, [nodes, q])

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
    apiRequest<LogisticsNode[]>(`/logistics/nodes?scenarioId=${encodeURIComponent(activeScenarioId)}`, { token })
      .then(setNodes)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load nodes failed'))
      .finally(() => setLoading(false))
  }, [token, activeScenarioId])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.replace('/login')
  }

  return (
    <main style={{ padding: 16, display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>Logistics Nodes</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{activeScenario ? `Scenario: ${activeScenario.name}` : 'Per scenario (demo)'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/logistics')} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            Logistics
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
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Search</div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="name / type / status" style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', height: 38, width: 280 }} />
          </div>
        </div>
      </section>

      <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ textAlign: 'left', fontSize: 12, opacity: 0.85 }}>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Name</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Type</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Status</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Stocks</th>
              <th style={{ padding: 10, borderBottom: '1px solid #1f2937' }}>Pos</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((n) => (
              <tr key={n.id}>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{n.name}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{n.nodeType}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827' }}>{n.status ?? '-'}</td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827', fontSize: 12, opacity: 0.9 }}>
                  fuel {n.fuelStock} • ammo {n.ammoStock} • ration {n.rationStock} • med {n.medicalStock} • spare {n.spareStock}
                </td>
                <td style={{ padding: 10, borderBottom: '1px solid #111827', fontSize: 12, opacity: 0.9 }}>
                  {n.xCoord.toFixed(3)},{n.yCoord.toFixed(3)}
                </td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={5} style={{ padding: 12, fontSize: 12, opacity: 0.8 }}>
                  Tidak ada node.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  )
}
