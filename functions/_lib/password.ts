function toBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

function encodeBase64(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data));
}

function decodeBase64(str: string): Uint8Array {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
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
