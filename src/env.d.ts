declare global {
  interface CloudflareEnv {
    DB: D1Database;
    JWT_SECRET: string;
  }

  interface D1Result<T = unknown> {
    results: T[];
    success: boolean;
    meta: {
      last_row_id: number;
      changes: number;
      duration: number;
    };
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    exec(query: string): Promise<D1Result>;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  }

  interface D1PreparedStatement {
    bind(...args: unknown[]): D1PreparedStatement;
    first<T = unknown>(col?: string): Promise<T | null>;
    run<T = unknown>(): Promise<D1Result<T>>;
    all<T = unknown>(): Promise<D1Result<T>>;
    raw<T = unknown>(): Promise<T[]>;
  }
}

export {};
