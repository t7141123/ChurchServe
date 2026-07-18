interface D1Database {
  prepare(query: string): D1Statement;
  exec(query: string): Promise<{ success: boolean }>;
  batch(statements: D1Statement[]): Promise<unknown>;
}

interface D1Statement {
  bind(...args: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(col?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean }>;
  run(): Promise<{ success: boolean }>;
}

interface CloudflareEnv {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends CloudflareEnv {}
  }
}
