// Minimal OSC encode/decode for the Behringer X32 (strings, int32, float32 only).
const pad = n => (4 - (n % 4)) % 4;
function str(s) { const b = Buffer.from(s + '\0'); return Buffer.concat([b, Buffer.alloc(pad(b.length))]); }
function encode(addr, args = []) {
  const tags = ',' + args.map(a => typeof a === 'string' ? 's' : a.f !== undefined ? 'f' : 'i').join('');
  const parts = [str(addr), str(tags)];
  for (const a of args) {
    if (typeof a === 'string') parts.push(str(a));
    else if (a.f !== undefined) { const b = Buffer.alloc(4); b.writeFloatBE(a.f); parts.push(b); }
    else { const b = Buffer.alloc(4); b.writeInt32BE(a | 0); parts.push(b); }
  }
  return Buffer.concat(parts);
}
function readStr(buf, o) { let e = o; while (e < buf.length && buf[e] !== 0) e++; const s = buf.toString('utf8', o, e); return [s, o + (e - o) + 1 + pad(e - o + 1)]; }
function decode(buf) {
  let [addr, o] = readStr(buf, 0); if (o >= buf.length) return { addr, args: [] };
  let tags; [tags, o] = readStr(buf, o); const args = [];
  for (const t of tags.slice(1)) {
    if (t === 's') { let s; [s, o] = readStr(buf, o); args.push(s); }
    else if (t === 'i') { args.push(buf.readInt32BE(o)); o += 4; }
    else if (t === 'f') { args.push(buf.readFloatBE(o)); o += 4; }
    else break;
  }
  return { addr, args };
}
module.exports = { encode, decode };
