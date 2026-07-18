export interface D1Database {
  prepare(query: string): D1Statement;
  exec(query: string): Promise<D1ExecResult>;
  batch<T = unknown>(statements: D1Statement[]): Promise<D1Result<T>[]>;
}

export interface D1Statement {
  bind(...args: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(col?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1ExecResult>;
}

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
}

export interface D1ExecResult {
  success: boolean;
  meta?: { duration?: number };
}

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}
