const { encrypt, decrypt, encryptMap, decryptMap } = require("../../src/utils/crypto");

// Set test encryption key
process.env.ENCRYPTION_KEY = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";

describe("crypto.js — AES-256-GCM", () => {
  test("encrypt returns iv:data:tag format", () => {
    const encrypted = encrypt("hello world");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);
    expect(parts[0].length).toBe(24); // 12-byte IV = 24 hex chars
  });

  test("decrypt reverses encrypt", () => {
    const original = "my_secret_database_password_123!";
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  test("encrypt returns empty string for empty input", () => {
    expect(encrypt("")).toBe("");
    expect(encrypt(null)).toBe("");
    expect(encrypt(undefined)).toBe("");
  });

  test("decrypt returns empty string for empty input", () => {
    expect(decrypt("")).toBe("");
  });

  test("decrypt returns original string for non-encrypted (legacy) data", () => {
    expect(decrypt("plain_text_value")).toBe("plain_text_value");
  });

  test("each encryption produces unique ciphertext (random IV)", () => {
    const a = encrypt("same");
    const b = encrypt("same");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("same");
    expect(decrypt(b)).toBe("same");
  });

  test("encryptMap encrypts all values in an object", () => {
    const map = { DB_HOST: "localhost", DB_PASS: "secret123" };
    const encrypted = encryptMap(map);
    expect(Object.keys(encrypted)).toEqual(["DB_HOST", "DB_PASS"]);
    expect(encrypted.DB_HOST).not.toBe("localhost");
    expect(encrypted.DB_HOST.split(":")).toHaveLength(3);
  });

  test("decryptMap decrypts all values", () => {
    const map = { KEY1: "value1", KEY2: "value2" };
    const encrypted = encryptMap(map);
    const decrypted = decryptMap(encrypted);
    expect(decrypted).toEqual(map);
  });

  test("decryptMap handles Map objects", () => {
    const map = new Map([["A", "1"], ["B", "2"]]);
    const encrypted = encryptMap(map);
    const decrypted = decryptMap(encrypted);
    expect(decrypted).toEqual({ A: "1", B: "2" });
  });

  test("throws error for invalid ENCRYPTION_KEY", () => {
    const origKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = "too_short";
    expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY must be a 64-char hex string");
    process.env.ENCRYPTION_KEY = origKey;
  });
});
