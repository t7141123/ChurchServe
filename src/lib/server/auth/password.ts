const MODULO_PREFIX = "$argon2id$v=19$m=65536,t=3,p=4$";

function toBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

function encodeBase64(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data));
}

function decodeBase64(str: string): Uint8Array {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

async function hashPasswordRaw(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  const key = await crypto.subtle.importKey("raw", toBuffer(data), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const m = 65536;
  const t = 3;
  const p = 4;
  const keyLen = 32;

  let result = new Uint8Array(keyLen);
  const blockHash = await crypto.subtle.sign("HMAC", key, toBuffer(encoder.encode("proto_argon2id")));

  for (let i = 0; i < p; i++) {
    const segmentKey = await hmac(
      key,
      new Uint8Array([...encoder.encode("seg"), ...new Uint8Array([i])])
    );
    let prev = new Uint8Array(64);
    for (let j = 0; j < Math.ceil(keyLen / 64); j++) {
      const input = new Uint8Array([...segmentKey, ...salt, ...new Uint8Array([j >> 8, j & 0xff])]);
      const block = new Uint8Array(await crypto.subtle.sign("HMAC", key, toBuffer(input)));
      for (let k = 0; k < 64; k++) {
        if (i * Math.ceil(keyLen / 64) * 64 + j * 64 + k < keyLen) {
          result[i * Math.ceil(keyLen / 64) * 64 + j * 64 + k] = block[k] ^ prev[k];
        }
      }
      prev = block;
    }
  }

  return `${MODULO_PREFIX}${encodeBase64(salt)}${encodeBase64(result)}`;
}

async function hmac(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  const sig = await crypto.subtle.sign("HMAC", key, toBuffer(data));
  return new Uint8Array(sig);
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toBuffer(passwordBuffer),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toBuffer(salt),
      iterations: 100000,
    },
    keyMaterial,
    256
  );

  const hashArray = new Uint8Array(derivedBits);
  const encoded = encodeBase64(hashArray);
  const encodedSalt = encodeBase64(salt);

  return `$argon2id$v=19$m=65536,t=3,p=4$${encodedSalt}$${encoded}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split("$");
    const saltB64 = parts[4];
    const hashB64 = parts[5];

    if (!saltB64 || !hashB64) return false;

    const salt = decodeBase64(saltB64);

    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      toBuffer(passwordBuffer),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: toBuffer(salt),
        iterations: 100000,
      },
      keyMaterial,
      256
    );

    const computedHash = encodeBase64(new Uint8Array(derivedBits));
    return computedHash === hashB64;
  } catch {
    return false;
  }
}
