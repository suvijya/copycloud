import WebSocket from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes, randomInt } from 'crypto';

/**
 * Network device sync service.
 *
 * Devices connect, announce themselves ("hello"), and become discoverable to
 * every other connected device. A device can request to pair with another;
 * the target device is shown a 6-digit OTP which the initiator must enter.
 * Once verified, the pairing is persisted to disk ("connected forever") and a
 * per-pair encryption key is issued to both devices. Clipboard updates are
 * forwarded only between paired devices. Either side can unpair at any time.
 */

interface DeviceConn {
  ws: WebSocket;
  deviceId: string;
  name: string;
  platform: string;
}

interface Pairing {
  a: string;
  b: string;
  key: string;
  names: Record<string, string>;
}

const PAIRINGS_FILE = path.join(process.cwd(), 'copycloud-pairings.json');
const OTP_TTL_MS = 2 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const WS_OPEN = 1; // WebSocket.OPEN ready state

const online = new Map<string, DeviceConn>();           // deviceId -> connection
const pending = new Map<string, { code: string; expires: number; attempts: number; initiator: string }>(); // canonical pair -> otp
let pairings: Pairing[] = loadPairings();

function loadPairings(): Pairing[] {
  try {
    return JSON.parse(fs.readFileSync(PAIRINGS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function savePairings(): void {
  try {
    fs.writeFileSync(PAIRINGS_FILE, JSON.stringify(pairings, null, 2));
  } catch (err) {
    console.error('Failed to persist pairings:', err);
  }
}

const canon = (a: string, b: string) => [a, b].sort().join('|');
const findPairing = (a: string, b: string) =>
  pairings.find((p) => canon(p.a, p.b) === canon(a, b));
const peersOf = (id: string) => pairings.filter((p) => p.a === id || p.b === id);
const peerId = (p: Pairing, self: string) => (p.a === self ? p.b : p.a);

function send(deviceId: string, msg: unknown): void {
  const conn = online.get(deviceId);
  if (conn && conn.ws.readyState === WS_OPEN) {
    conn.ws.send(JSON.stringify(msg));
  }
}

function sendDeviceList(viewerId: string): void {
  const devices = [...online.values()]
    .filter((c) => c.deviceId !== viewerId)
    .map((c) => ({
      deviceId: c.deviceId,
      name: c.name,
      platform: c.platform,
      online: true,
      paired: !!findPairing(viewerId, c.deviceId),
    }));

  // Include paired-but-offline devices so the user can still see / unpair them.
  for (const p of peersOf(viewerId)) {
    const pid = peerId(p, viewerId);
    if (!online.has(pid)) {
      devices.push({
        deviceId: pid,
        name: p.names[pid] || 'Device',
        platform: 'unknown',
        online: false,
        paired: true,
      });
    }
  }

  send(viewerId, { type: 'device_list', devices });
}

function broadcastDeviceList(): void {
  for (const id of online.keys()) sendDeviceList(id);
}

export function syncWebSocket(conn: any, _request: any): void {
  // @fastify/websocket v10 passes the socket directly; older versions wrap it.
  const ws: WebSocket = conn && conn.socket ? conn.socket : conn;
  let myId: string | null = null;

  ws.on('message', (data: WebSocket.RawData) => {
    let msg: any;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case 'hello': {
        if (!msg.deviceId) return;
        const id: string = msg.deviceId;
        myId = id;
        online.set(id, {
          ws,
          deviceId: id,
          name: msg.name || 'Device',
          platform: msg.platform || 'unknown',
        });
        // Hand back existing pairings (with keys) so this device can decrypt peers.
        send(id, {
          type: 'pairings',
          peers: peersOf(id).map((p) => ({
            peerId: peerId(p, id),
            name: p.names[peerId(p, id)] || 'Device',
            key: p.key,
          })),
        });
        broadcastDeviceList();
        break;
      }

      case 'list':
        if (myId) sendDeviceList(myId);
        break;

      case 'pair_request': {
        if (!myId) return;
        const target = msg.targetId;
        if (!online.has(target)) {
          send(myId, { type: 'pair_failed', peerId: target, reason: 'Device offline' });
          break;
        }
        if (findPairing(myId, target)) {
          send(myId, { type: 'pair_failed', peerId: target, reason: 'Already paired' });
          break;
        }
        const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
        pending.set(canon(myId, target), { code, expires: Date.now() + OTP_TTL_MS, attempts: 0, initiator: myId });
        const me = online.get(myId)!;
        // Target shows the OTP; initiator is prompted to enter it.
        send(target, { type: 'pair_code', peerId: myId, peerName: me.name, code });
        send(myId, { type: 'pair_awaiting', peerId: target, peerName: online.get(target)!.name });
        break;
      }

      case 'pair_verify': {
        if (!myId) return;
        const target = msg.targetId;
        const key = canon(myId, target);
        const entry = pending.get(key);
        if (!entry || entry.expires < Date.now()) {
          pending.delete(key);
          send(myId, { type: 'pair_failed', peerId: target, reason: 'Code expired' });
          send(target, { type: 'pair_cancelled', peerId: myId });
          break;
        }
        // Only the device that initiated the request may verify the code.
        if (entry.initiator !== myId) {
          send(myId, { type: 'pair_failed', peerId: target, reason: 'Not the initiator' });
          break;
        }
        if (String(msg.code) !== entry.code) {
          entry.attempts++;
          if (entry.attempts >= MAX_OTP_ATTEMPTS) {
            pending.delete(key);
            send(myId, { type: 'pair_failed', peerId: target, reason: 'Too many attempts' });
            send(target, { type: 'pair_cancelled', peerId: myId });
          } else {
            const left = MAX_OTP_ATTEMPTS - entry.attempts;
            send(myId, { type: 'pair_failed', peerId: target, reason: `Wrong code (${left} left)` });
          }
          break;
        }
        pending.delete(key);
        const pairKey = randomBytes(32).toString('hex');
        const myName = online.get(myId)?.name || 'Device';
        const targetName = online.get(target)?.name || 'Device';
        pairings.push({ a: myId, b: target, key: pairKey, names: { [myId]: myName, [target]: targetName } });
        savePairings();
        send(myId, { type: 'paired', peerId: target, peerName: targetName, key: pairKey });
        send(target, { type: 'paired', peerId: myId, peerName: myName, key: pairKey });
        broadcastDeviceList();
        break;
      }

      case 'unpair': {
        if (!myId) return;
        const target = msg.targetId;
        const c = canon(myId, target);
        pairings = pairings.filter((p) => canon(p.a, p.b) !== c);
        savePairings();
        send(myId, { type: 'unpaired', peerId: target });
        send(target, { type: 'unpaired', peerId: myId });
        broadcastDeviceList();
        break;
      }

      case 'clip': {
        if (!myId) return;
        const target = msg.targetId;
        if (!findPairing(myId, target)) return; // only forward between paired devices
        send(target, {
          type: 'clip',
          fromId: myId,
          content_type: msg.content_type,
          encrypted_content: msg.encrypted_content,
          metadata: msg.metadata,
        });
        break;
      }

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  });

  ws.on('close', () => {
    if (myId && online.get(myId)?.ws === ws) {
      online.delete(myId);
      broadcastDeviceList();
    }
  });

  ws.on('error', (err: Error) => {
    console.error('WebSocket error:', err.message);
  });
}
