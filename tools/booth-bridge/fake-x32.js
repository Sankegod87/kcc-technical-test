// Pretend X32 for testing the bridge (answers the same OSC queries). node fake-x32.js [port]
const dgram = require('dgram'), { encode, decode } = require('./osc.js');
const port = +process.argv[2] || 10023, muted = new Set([4]); let main = 1;
const s = dgram.createSocket('udp4');
s.on('message', (m, r) => {
  const { addr } = decode(m), say = (a, args) => s.send(encode(a, args), r.port, r.address); let g;
  if (addr === '/xinfo') say(addr, ['127.0.0.1', 'FAKE-X32', 'X32', '4.06']);
  else if (addr === '/main/st/mix/on') say(addr, [main]);
  else if ((g = /^\/ch\/(\d\d)\/mix\/on$/.exec(addr))) say(addr, [muted.has(+g[1]) ? 0 : 1]);
  else if ((g = /^\/ch\/(\d\d)\/config\/name$/.exec(addr))) say(addr, [['Pastor', 'Choir L', 'Choir R', 'Piano', 'Gtr', 'Bass', 'Keys', 'Drums'][+g[1] - 1] || 'Ch ' + g[1]]);
});
s.bind(port, () => console.log('fake X32 on UDP ' + port));
module.exports = { s, muted, setMain: v => { main = v; } };
