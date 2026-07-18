const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const CLEANUP_INTERVAL = 60000;

let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetAt: now + windowMs };
  }

  entry.count++;

  if (entry.count > maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: maxAttempts - entry.count, resetAt: entry.resetAt };
}

export async function checkD1RateLimit(
  db: D1Database,
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const windowMinutes = Math.ceil(windowMs / 60000);
  const ip = key.replace("login:", "");

  const cutoff = `-${windowMinutes} minutes`;

  await db.prepare(
    "DELETE FROM LoginAttempts WHERE attempted_at < datetime('now', ?)"
  ).bind(cutoff).run();

  const result = await db.prepare(
    "SELECT COUNT(*) as cnt FROM LoginAttempts WHERE ip_address = ? AND attempted_at >= datetime('now', ?)"
  ).bind(ip, cutoff).first() as { cnt: number } | null;

  const count = result?.cnt ?? 0;

  if (count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: Date.now() + windowMs };
  }

  await db.prepare(
    "INSERT INTO LoginAttempts (ip_address) VALUES (?)"
  ).bind(ip).run();

  return { allowed: true, remaining: maxAttempts - count - 1, resetAt: Date.now() + windowMs };
}

export async function resetD1RateLimit(db: D1Database, key: string) {
  const ip = key.replace("login:", "");
  await db.prepare("DELETE FROM LoginAttempts WHERE ip_address = ?").bind(ip).run();
}
