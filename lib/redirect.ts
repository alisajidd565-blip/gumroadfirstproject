/** Prevent open redirects — only allow same-app relative paths. */
export function getSafeRedirectPath(next: string | string[] | undefined, fallback = '/dashboard'): string {
  const raw = Array.isArray(next) ? next[0] : next;
  if (!raw || typeof raw !== 'string') return fallback;

  const path = raw.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return fallback;
  if (path.includes('://')) return fallback;

  return path;
}
