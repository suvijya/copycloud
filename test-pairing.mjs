// End-to-end test of the device discovery + OTP pairing + clip sync flow.
import WebSocket from 'ws';

const URL = 'ws://localhost:3737/ws';
const A = { id: 'test-device-A', name: 'Laptop-A', platform: 'windows' };
const B = { id: 'test-device-B', name: 'Desktop-B', platform: 'linux' };

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
function check(cond, label) {
  console.log(`${cond ? 'PASS' : 'FAIL'} - ${label}`);
  if (!cond) failures++;
}

function connect(dev) {
  return new Promise((resolve) => {
    const ws = new WebSocket(URL);
    const inbox = [];
    ws.on('message', (raw) => inbox.push(JSON.parse(raw.toString())));
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'hello', deviceId: dev.id, name: dev.name, platform: dev.platform, space: dev.space }));
      resolve({ ws, inbox, dev });
    });
  });
}
const last = (inbox, type) => [...inbox].reverse().find((m) => m.type === type);

const run = async () => {
  const a = await connect(A);
  const b = await connect(B);
  await wait(400);

  // 1. Discovery: A should see B on the network, unpaired.
  a.ws.send(JSON.stringify({ type: 'list' }));
  await wait(300);
  const listA = last(a.inbox, 'device_list');
  const seesB = listA?.devices.find((d) => d.deviceId === B.id);
  check(!!seesB, 'A discovers B on the network');
  check(seesB && seesB.online && !seesB.paired, 'B shows as online and not yet paired');

  // 1b. Space isolation: a device in a different space is invisible.
  const e = await connect({ id: 'test-device-E', name: 'Isolated-E', platform: 'linux', space: 'private-space-xyz' });
  await wait(300);
  a.ws.send(JSON.stringify({ type: 'list' }));
  e.ws.send(JSON.stringify({ type: 'list' }));
  await wait(300);
  const listAfterE = last(a.inbox, 'device_list');
  check(!listAfterE.devices.find((d) => d.deviceId === 'test-device-E'), 'Device in another space is hidden from A');
  const listE = last(e.inbox, 'device_list');
  check(!listE.devices.find((d) => d.deviceId === A.id), 'A is hidden from a device in another space');
  e.ws.close();
  await wait(200);

  // 2. Pairing: A requests pair -> B receives OTP -> A verifies.
  a.ws.send(JSON.stringify({ type: 'pair_request', targetId: B.id }));
  await wait(300);
  const code = last(b.inbox, 'pair_code');
  check(!!code && /^\d{6}$/.test(code.code), 'B is shown a 6-digit OTP');
  const awaiting = last(a.inbox, 'pair_awaiting');
  check(!!awaiting, 'A is prompted to enter the code');

  // Wrong code is rejected (with remaining-attempts feedback).
  a.ws.send(JSON.stringify({ type: 'pair_verify', targetId: B.id, code: '000000' }));
  await wait(200);
  const failed = last(a.inbox, 'pair_failed');
  check(failed && /^Wrong code/.test(failed.reason), 'Wrong OTP is rejected');

  // Correct code pairs both sides and issues a shared key.
  a.ws.send(JSON.stringify({ type: 'pair_verify', targetId: B.id, code: code.code }));
  await wait(300);
  const pairedA = last(a.inbox, 'paired');
  const pairedB = last(b.inbox, 'paired');
  check(!!pairedA && !!pairedB, 'Both devices receive paired confirmation');
  check(pairedA && pairedB && pairedA.key === pairedB.key, 'Both receive the same shared key');

  // 3. Clip forwarding only between paired devices.
  b.inbox.length = 0;
  a.ws.send(JSON.stringify({ type: 'clip', targetId: B.id, content_type: 'text', encrypted_content: 'CIPHERTEXT', metadata: { size: 10 } }));
  await wait(300);
  const clip = last(b.inbox, 'clip');
  check(clip && clip.encrypted_content === 'CIPHERTEXT' && clip.fromId === A.id, 'Clip is forwarded to paired device');

  // 4. Persistence: a fresh connection for A should still see B as paired.
  const a2 = await connect(A);
  await wait(400);
  const pairingsA2 = last(a2.inbox, 'pairings');
  check(pairingsA2 && pairingsA2.peers.some((p) => p.peerId === B.id), 'Pairing persists across reconnect');

  // 4b. OTP brute-force protection: 5 wrong codes invalidate the OTP.
  // Use fresh devices C (target) and D (initiator) to avoid clashing with A/a2.
  const d = await connect({ id: 'test-device-D', name: 'Tablet-D', platform: 'ios' });
  const c = await connect({ id: 'test-device-C', name: 'Phone-C', platform: 'android' });
  await wait(400);
  d.ws.send(JSON.stringify({ type: 'pair_request', targetId: 'test-device-C' }));
  await wait(300);
  c.inbox.length = 0;
  d.inbox.length = 0;
  for (let i = 0; i < 5; i++) {
    d.ws.send(JSON.stringify({ type: 'pair_verify', targetId: 'test-device-C', code: '999999' }));
    await wait(120);
  }
  const tooMany = last(d.inbox, 'pair_failed');
  check(tooMany && tooMany.reason === 'Too many attempts', 'OTP invalidated after 5 wrong attempts');
  check(!!last(c.inbox, 'pair_cancelled'), 'Target OTP is cancelled after too many attempts');
  c.ws.close(); d.ws.close();

  // 5. Disconnect (unpair).
  a.ws.send(JSON.stringify({ type: 'unpair', targetId: B.id }));
  await wait(300);
  const unpairedB = last(b.inbox, 'unpaired');
  check(!!unpairedB, 'Unpair notifies the peer');

  a.ws.close(); b.ws.close(); a2.ws.close();
  await wait(200);
  console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
};

run();
