"use client"

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { apiRequest, type LoginResponse } from '@/app/lib/api'
import { DEMO_ACCOUNTS, type DemoRole, getDefaultRouteForRole } from '@/app/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('commander@example.local')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canSubmit = useMemo(() => email.trim().length > 3 && password.trim().length > 0, [email, password])
  const visibleDemoAccounts = useMemo(() => DEMO_ACCOUNTS.filter((a) => a.role !== 'flatpanel'), [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setLoading(true)
    try {
      const data = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push(getDefaultRouteForRole(data.user.role as DemoRole))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: '#ffffff',
        color: '#0f172a',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          width: 'min(1040px, 100%)',
          borderRadius: 18,
          background: '#ffffff',
          boxShadow: '0 26px 70px rgba(0,0,0,0.22)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '1fr',
          minHeight: 520
        }}
      >
        <div
          style={{
            display: 'grid',
            minHeight: 520,
            gridTemplateColumns: '1fr 1fr'
          }}
        >
          <section
            style={{
              position: 'relative',
              overflow: 'hidden',
              minHeight: 520
            }}
          >
            <Image
              src="/images/coverlogintni.png"
              alt="Cover Login TNI"
              fill
              priority
              sizes="(min-width: 768px) 520px, 0px"
              style={{ objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(15,23,42,0.65) 0%, rgba(15,23,42,0.10) 75%)' }} />
          </section>

          <section
            style={{
              display: 'grid',
              placeItems: 'center',
              padding: 48
            }}
          >
            <div style={{ width: 'min(420px, 100%)' }}>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.25em', color: '#94a3b8' }}>JOINT COMMAND</div>
                <h1 style={{ marginTop: 8, marginBottom: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a' }}>Sign In</h1>
                <div style={{ marginTop: 6, fontSize: 14, color: '#64748b' }}>Gunakan akun demo atau email & password.</div>
              </div>

              <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  <label htmlFor="login-email" style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                    Email
                  </label>
                  <input
                    id="login-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.local"
                    autoComplete="email"
                    style={{
                      height: 44,
                      width: '100%',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      color: '#0f172a',
                      padding: '0 14px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <label htmlFor="login-password" style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      height: 44,
                      width: '100%',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      color: '#0f172a',
                      padding: '0 14px',
                      outline: 'none'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  style={{
                    marginTop: 8,
                    height: 44,
                    width: '100%',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(90deg, #f97316 0%, #f43f5e 48%, #c026d3 100%)',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: !canSubmit || loading ? 'not-allowed' : 'pointer',
                    opacity: !canSubmit || loading ? 0.6 : 1,
                    boxShadow: '0 14px 28px rgba(234, 88, 12, 0.22)'
                  }}
                >
                  {loading ? 'Signing in...' : 'Continue'}
                </button>

                {error ? (
                  <div style={{ borderRadius: 10, border: '1px solid #fecdd3', background: '#fff1f2', padding: '10px 12px', fontSize: 14, color: '#9f1239' }}>
                    {error}
                  </div>
                ) : null}

                <div style={{ paddingTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Demo accounts</div>
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {visibleDemoAccounts.map((a) => (
                      <button
                        key={a.email}
                        type="button"
                        style={{
                          borderRadius: 9999,
                          border: '1px solid #e2e8f0',
                          background: '#ffffff',
                          padding: '6px 10px',
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#334155',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setEmail(a.email)
                          setPassword('password123')
                        }}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: '#64748b' }}>Password demo: password123</div>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
