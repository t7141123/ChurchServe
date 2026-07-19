// Run with: node scripts/hash-password.mjs
const password = process.argv[2] || "admin123";

function toBuffer(data) {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

function encodeBase64(data) {
  return btoa(String.fromCharCode(...data));
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    "raw", toBuffer(passwordBuffer), { name: "PBKDF2" }, false, ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: toBuffer(salt), iterations: 100000 },
    keyMaterial, 256
  );

  const hashArray = new Uint8Array(derivedBits);
  const encodedSalt = encodeBase64(salt);
  const encoded = encodeBase64(hashArray);
  return `$argon2id$v=19$m=65536,t=3,p=4$${encodedSalt}$${encoded}`;
}

// Note: The format above stores salt then hash, but verifyPassword expects:
// $format$...$salt$hash  (parts[4]=salt, parts[5]=hash)
// The hashPassword function returns salt then hash, so we need to check verifyPassword
// Actually looking at password.ts line 41:
// return `$argon2id$v=19$m=65536,t=3,p=4$${encodedSalt}$${encoded}`;
// So it's: $prefix$salt$hash

hashPassword(password).then((hash) => {
  console.log("Password:", password);
  console.log("Hash:", hash);
  console.log("\nSQL to insert admin:");
  console.log(`INSERT INTO Admins (username, password_hash, must_change_password) VALUES ('admin', '${hash}', 0);`);
});
