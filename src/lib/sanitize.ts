export function sanitize(input: string): string {
  if (!input || typeof input !== "string") return "";

  let result = input;

  result = result.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  result = result.replace(/"/g, "&quot;");
  result = result.replace(/'/g, "&#x27;");

  result = result.replace(/on\w+\s*=/gi, " data-removed=");
  result = result.replace(/javascript\s*:/gi, "blocked:");

  return result;
}

export function sanitizeStrict(input: string): string {
  if (!input || typeof input !== "string") return "";

  let result = input;

  result = result.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  result = result.replace(/"/g, "&quot;");
  result = result.replace(/'/g, "&#x27;");

  return result;
}

export function isValidName(name: string): boolean {
  if (!name || typeof name !== "string") return false;
  if (name.length > 50) return false;

  const dangerous = /[<>{}[\]\\]/;
  if (dangerous.test(name)) return false;

  return true;
}
