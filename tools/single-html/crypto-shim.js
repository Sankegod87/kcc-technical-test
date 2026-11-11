// Browser stand-in for the few Node `crypto` calls the server logic uses (pure JS, so it runs inside one HTML file).
import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import { scrypt } from '@noble/hashes/scrypt.js';
import { Buffer } from 'buffer';
const bytes = (v, enc) => typeof v === 'string' ? new TextEncoder().encode(v) : v;
export function randomBytes(n) { return Buffer.from(crypto.getRandomValues(new Uint8Array(n))); }
export function scryptSync(pw, salt, len, o) { return Buffer.from(scrypt(bytes(pw), bytes(salt), { N: o.N, r: o.r, p: o.p, dkLen: len })); }
export function timingSafeEqual(a, b) { let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; }
const hex = u => Array.from(u, x => x.toString(16).padStart(2, '0')).join('');
export function createHash(alg) { const parts = []; const o = { update(s) { parts.push(bytes(s)); return o; }, digest(enc) { const all = Buffer.concat(parts.map(p => Buffer.from(p))); const d = sha256(all); return enc === 'hex' ? hex(d) : Buffer.from(d); } }; return o; }
export function createHmac(alg, key) { const parts = []; const o = { update(s) { parts.push(bytes(s)); return o; }, digest(enc) { const all = Buffer.concat(parts.map(p => Buffer.from(p))); const d = hmac(sha256, bytes(key), all); return enc === 'hex' ? hex(d) : Buffer.from(d); } }; return o; }
export default { randomBytes, scryptSync, timingSafeEqual, createHash, createHmac };
