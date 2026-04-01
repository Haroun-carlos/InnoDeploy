const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

const getKey = () => {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-char hex string (32 bytes). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
};

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns a single string: iv:ciphertext:tag (all hex-encoded).
 */
const encrypt = (plaintext) => {
  if (!plaintext) return "";
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
};

/**
 * Decrypt an AES-256-GCM encrypted string (iv:ciphertext:tag).
 * Returns the original plaintext.
 */
const decrypt = (encryptedStr) => {
  if (!encryptedStr) return "";
  const parts = encryptedStr.split(":");
  if (parts.length !== 3) return encryptedStr; // not encrypted (legacy plaintext)
  const [ivHex, dataHex, tagHex] = parts;
  try {
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const data = Buffer.from(dataHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data) + decipher.final("utf8");
  } catch {
    return encryptedStr; // return as-is if decryption fails (legacy data)
  }
};

/**
 * Encrypt all values in a Map or plain object.
 */
const encryptMap = (map) => {
  const result = {};
  const entries = map instanceof Map ? map.entries() : Object.entries(map || {});
  for (const [key, value] of entries) {
    result[key] = encrypt(String(value));
  }
  return result;
};

/**
 * Decrypt all values in a Map or plain object.
 */
const decryptMap = (map) => {
  const result = {};
  const entries = map instanceof Map ? map.entries() : Object.entries(map || {});
  for (const [key, value] of entries) {
    result[key] = decrypt(String(value));
  }
  return result;
};

module.exports = { encrypt, decrypt, encryptMap, decryptMap };
