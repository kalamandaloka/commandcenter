"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { apiRequest } from '@/app/lib/api'
import { type DemoRole, getDefaultRouteForRole, getStoredUser, isRoleAllowedForPath } from '@/app/lib/auth'

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
  createdAt: string
  updatedAt: string
}

export default function UnitDetailPage() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [token, setToken] = useState<string | null>(null)
  const [role, setRole] = useState<DemoRole>('commander')
  const canEdit = role === 'operations' || role === 'logistics' || role === 'director'

  const [unit, setUnit] = useState<Unit | null>(null)
  const [draft, setDraft] = useState<Partial<Unit>>({})

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const title = useMemo(() => (unit ? `${unit.code} • ${unit.name}` : 'Unit Detail'), [unit])

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
      if (!isRoleAllowedForPath(u.role, '/units')) {
        router.replace(getDefaultRouteForRole(u.role))
      }
    }
  }, [router, pathname])

  useEffect(() => {
    if (!token || !id) return
    setLoading(true)
    setError(null)
    apiRequest<Unit>(`/units/${encodeURIComponent(id)}`, { token })
      .then((u) => {
        setUnit(u)
        setDraft({
          name: u.name,
          readinessScore: u.readinessScore,
          supplyScore: u.supplyScore,
          moraleScore: u.moraleScore,
          xCoord: u.xCoord,
          yCoord: u.yCoord,
          heading: u.heading ?? 0,
          parentCommand: u.parentCommand ?? '',
          status: u.status
        })
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Load unit failed'))
      .finally(() => setLoading(false))
  }, [token, id])

  async function save() {
    if (!token || !id) return
    setLoading(true)
    setError(null)
    try {
      const updated = await apiRequest<Unit>(`/units/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          name: draft.name,
          readinessScore: Number(draft.readinessScore),
          supplyScore: Number(draft.supplyScore),
          moraleScore: Number(draft.moraleScore),
          xCoord: Number(draft.xCoord),
          yCoord: Number(draft.yCoord),
          heading: draft.heading === null || draft.heading === undefined ? null : Number(draft.heading),
          parentCommand: draft.parentCommand ? String(draft.parentCommand) : null,
          status: draft.status
        })
      })
      setUnit(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
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
          <div style={{ fontSize: 12, opacity: 0.8 }}>{unit ? `${unit.branch} • ${unit.status}` : 'Loading...'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/units')} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            Units
          </button>
          <button onClick={logout} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e5e7eb' }}>
            Logout
          </button>
        </div>
      </header>

      {error ? <div style={{ color: '#fb7185' }}>{error}</div> : null}
      {loading ? <div style={{ opacity: 0.8 }}>Loading...</div> : null}

      {unit ? (
        <section style={{ border: '1px solid #1f2937', borderRadius: 12, padding: 12, background: '#0f172a', display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Name
              <input
                value={String(draft.name ?? '')}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                disabled={!canEdit}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Status
              <input
                value={String(draft.status ?? '')}
                onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value }))}
                disabled={!canEdit}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Parent Command
              <input
                value={String(draft.parentCommand ?? '')}
                onChange={(e) => setDraft((p) => ({ ...p, parentCommand: e.target.value }))}
                disabled={!canEdit}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Readiness
              <input
                type="number"
                value={Number(draft.readinessScore ?? 0)}
                onChange={(e) => setDraft((p) => ({ ...p, readinessScore: Number(e.target.value) }))}
                disabled={!canEdit}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Supply
              <input
                type="number"
                value={Number(draft.supplyScore ?? 0)}
                onChange={(e) => setDraft((p) => ({ ...p, supplyScore: Number(e.target.value) }))}
                disabled={!canEdit}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Morale
              <input
                type="number"
                value={Number(draft.moraleScore ?? 0)}
                onChange={(e) => setDraft((p) => ({ ...p, moraleScore: Number(e.target.value) }))}
                disabled={!canEdit}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              X
              <input
                type="number"
                value={Number(draft.xCoord ?? 0)}
                onChange={(e) => setDraft((p) => ({ ...p, xCoord: Number(e.target.value) }))}
                disabled={!canEdit}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Y
              <input
                type="number"
                value={Number(draft.yCoord ?? 0)}
                onChange={(e) => setDraft((p) => ({ ...p, yCoord: Number(e.target.value) }))}
                disabled={!canEdit}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9 }}>
              Heading
              <input
                type="number"
                value={Number(draft.heading ?? 0)}
                onChange={(e) => setDraft((p) => ({ ...p, heading: Number(e.target.value) }))}
                disabled={!canEdit}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb' }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              id: {unit.id} • scenarioId: {unit.scenarioId}
            </div>
            {canEdit ? (
              <button
                onClick={save}
                disabled={loading}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #22c55e', background: '#14532d', color: '#bbf7d0', height: 38 }}
              >
                Save
              </button>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.8 }}>Read-only</div>
            )}
          </div>
        </section>
      ) : null}
    </main>
  )
}
