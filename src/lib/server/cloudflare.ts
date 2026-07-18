import { getCloudflareContext } from "@opennextjs/cloudflare";

interface D1Database {
  prepare(query: string): {
    bind(...args: unknown[]): {
      first<T>(col?: string): Promise<T | null>;
      all<T>(): Promise<{ results: T[] }>;
      run(): Promise<{ success: boolean }>;
    };
  };
  exec(query: string): Promise<{ success: boolean }>;
}

export async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}
