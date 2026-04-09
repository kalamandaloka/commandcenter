export type DemoRole = 'commander' | 'flatpanel' | 'operations' | 'intelligence' | 'logistics' | 'director' | 'evaluator'

export type StoredUser = { id: string; name: string; email: string; role: DemoRole }

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const u = JSON.parse(raw) as StoredUser
    if (!u?.role) return null
    return u
  } catch {
    return null
  }
}

export function getDefaultRouteForRole(role: DemoRole): string {
  switch (role) {
    case 'commander':
      return '/dashboard/command'
    case 'flatpanel':
      return '/dashboard/flatpanel'
    case 'operations':
      return '/tasking'
    case 'intelligence':
      return '/intel'
    case 'logistics':
      return '/logistics'
    case 'director':
      return '/director/control'
    case 'evaluator':
      return '/viewer/live'
    default:
      return '/dashboard/command'
  }
}

export function isRoleAllowedForPath(role: DemoRole, path: string): boolean {
  const p = path.split('?')[0] ?? path
  if (role === 'director') return true

  const allow: Record<DemoRole, string[]> = {
    commander: ['/dashboard/command', '/viewer/live', '/aar', '/tasking', '/intel', '/logistics', '/logistics/nodes', '/logistics/missions', '/scenarios', '/units', '/missions', '/orders', '/planner'],
    flatpanel: ['/dashboard/flatpanel', '/dashboard/command', '/viewer/live', '/aar', '/tasking', '/intel', '/logistics', '/logistics/nodes', '/logistics/missions', '/scenarios', '/units', '/missions', '/orders', '/planner'],
    operations: ['/tasking', '/viewer/live', '/dashboard/command', '/scenarios', '/units', '/missions', '/orders', '/planner'],
    intelligence: ['/intel', '/viewer/live', '/dashboard/command', '/units'],
    logistics: ['/logistics', '/logistics/nodes', '/logistics/missions', '/viewer/live', '/dashboard/command', '/units'],
    director: ['*'],
    evaluator: ['/viewer/live', '/aar', '/tasking', '/dashboard/command', '/units', '/missions', '/orders', '/planner']
  }
  const list = allow[role]
  if (list.includes('*')) return true
  return list.some((prefix) => p === prefix || p.startsWith(prefix + '/'))
}

export const DEMO_ACCOUNTS: Array<{ label: string; email: string; role: DemoRole }> = [
  { label: 'Commander', email: 'commander@example.local', role: 'commander' },
  { label: 'Flatpanel', email: 'flatpanel@example.local', role: 'flatpanel' },
  { label: 'Operations', email: 'ops@example.local', role: 'operations' },
  { label: 'Intelligence', email: 'intel@example.local', role: 'intelligence' },
  { label: 'Logistics', email: 'log@example.local', role: 'logistics' },
  { label: 'Director', email: 'director@example.local', role: 'director' },
  { label: 'Evaluator', email: 'evaluator@example.local', role: 'evaluator' }
]
