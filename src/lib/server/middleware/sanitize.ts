const TAG_REPLACEMENTS: Record<string, string> = {
  script: "",
  iframe: "",
  object: "",
  embed: "",
  form: "",
  input: "",
  textarea: "",
  select: "",
  button: "",
  link: "",
  meta: "",
  style: "",
  base: "",
  applet: "",
};

const EVENT_ATTR_RE = /on\w+\s*=/gi;
const JS_PROTOCOL_RE = /javascript\s*:/gi;
const HTML_TAGS_RE = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi;
const ATTR_RE = /\s([a-zA-Z-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/g;

const SAFE_ATTRS = new Set([
  "class", "style", "id", "data-", "aria-", "role",
  "href", "src", "alt", "title", "width", "height",
  "colspan", "rowspan", "scope",
]);

export function sanitize(input: string): string {
  if (!input || typeof input !== "string") return "";

  let result = input;

  result = result.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  result = result.replace(EVENT_ATTR_RE, " data-removed=");
  result = result.replace(JS_PROTOCOL_RE, "blocked:");

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
