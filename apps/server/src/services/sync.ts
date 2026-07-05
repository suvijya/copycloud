import WebSocket from 'ws';
import { randomBytes, randomInt } from 'crypto';
import { FastifyRequest } from 'fastify';
import { config } from '../config';
import { DeviceModel, PairingModel } from '../models/index';

interface DeviceConn {
  ws: WebSocket;
  deviceId: string;
  userId: string;
  name: string;
  platform: string;
  space: string;
}

interface PendingOTP {
  code: string;
  expires: number;
  attempts: number;
  initiator: string;
}

const online = new Map<string, DeviceConn>();
const pending = new Map<string, PendingOTP>();

const WS_OPEN = 1;
const canon = (a: string, b: string) => [a, b].sort().join('|');

function send(deviceId: string, msg: unknown): void {
  const conn = online.get(deviceId);
  if (conn && conn.ws.readyState === WS_OPEN) {
    conn.ws.send(JSON.stringify(msg));
  }
}

function sendDeviceList(viewerId: string): void {
  const viewerSpace = online.get(viewerId)?.space ?? 'local';
  const viewerUserId = online.get(viewerId)?.userId;

  const devices = [...online.values()]
    .filter((c) => c.deviceId !== viewerId && c.space === viewerSpace)
    .map((c) => ({
      deviceId: c.deviceId,
      name: c.name,
      platform: c.platform,
      online: true,
      paired: false, // Will be updated below
    }));

  // Add paired devices (online and offline)
  if (viewerUserId) {
    // This would need to query the database for pairings
    // For now, we'll just return online devices
  }

  send(viewerId, { type: 'device_list', devices });
}

function broadcastDeviceList(): void {
  for (const id of online.keys()) sendDeviceList(id);
}

export function syncWebSocket(conn: any, request: FastifyRequest): void {
  const ws: WebSocket = conn && conn.socket ? conn.socket : conn;
  let myId: string | null = null;

  ws.on('message', async (data: WebSocket.RawData) => {
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
          userId: msg.userId || 'anonymous',
          name: msg.name || 'Device',
          platform: msg.platform || 'unknown',
          space: msg.space || 'local',
        });

        // Send existing pairings
        try {
          const pairings = await PairingModel.findByDeviceId(id);
          const peers = pairings.map((p) => ({
            peerId: p.device_a_id === id ? p.device_b_id : p.device_a_id,
            name: p.device_a_id === id ? p.device_b_name : p.device_a_name,
            key: p.encryption_key,
          }));
          send(id, { type: 'pairings', peers });
        } catch (error) {
          console.error('Failed to load pairings:', error);
        }

        broadcastDeviceList();
        break;
      }

      case 'list':
        if (myId) sendDeviceList(myId);
        break;

      case 'pair_request': {
        if (!myId) return;
        const target = msg.targetId;
        const me = online.get(myId)!;
        const targetConn = online.get(target);

        if (!targetConn || targetConn.space !== me.space) {
          send(myId, { type: 'pair_failed', peerId: target, reason: 'Device offline' });
          break;
        }

        // Check if already paired
        const existing = await PairingModel.findBetweenDevices(myId, target);
        if (existing) {
          send(myId, { type: 'pair_failed', peerId: target, reason: 'Already paired' });
          break;
        }

        const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
        pending.set(canon(myId, target), {
          code,
          expires: Date.now() + config.pairing.otpExpiry,
          attempts: 0,
          initiator: myId,
        });

        send(target, { type: 'pair_code', peerId: myId, peerName: me.name, code });
        send(myId, { type: 'pair_awaiting', peerId: target, peerName: targetConn.name });
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

        if (entry.initiator !== myId) {
          send(myId, { type: 'pair_failed', peerId: target, reason: 'Not the initiator' });
          break;
        }

        if (String(msg.code) !== entry.code) {
          entry.attempts++;
          if (entry.attempts >= config.pairing.maxAttempts) {
            pending.delete(key);
            send(myId, { type: 'pair_failed', peerId: target, reason: 'Too many attempts' });
            send(target, { type: 'pair_cancelled', peerId: myId });
          } else {
            const left = config.pairing.maxAttempts - entry.attempts;
            send(myId, { type: 'pair_failed', peerId: target, reason: `Wrong code (${left} left)` });
          }
          break;
        }

        pending.delete(key);
        const pairKey = randomBytes(32).toString('hex');
        const myName = online.get(myId)?.name || 'Device';
        const targetName = online.get(target)?.name || 'Device';

        try {
          await PairingModel.create({
            device_a_id: myId,
            device_b_id: target,
            encryption_key: pairKey,
            device_a_name: myName,
            device_b_name: targetName,
          });

          send(myId, { type: 'paired', peerId: target, peerName: targetName, key: pairKey });
          send(target, { type: 'paired', peerId: myId, peerName: myName, key: pairKey });
          broadcastDeviceList();
        } catch (error) {
          console.error('Failed to create pairing:', error);
          send(myId, { type: 'pair_failed', peerId: target, reason: 'Server error' });
        }
        break;
      }

      case 'unpair': {
        if (!myId) return;
        const target = msg.targetId;

        try {
          await PairingModel.deactivateBetweenDevices(myId, target);
          send(myId, { type: 'unpaired', peerId: target });
          send(target, { type: 'unpaired', peerId: myId });
          broadcastDeviceList();
        } catch (error) {
          console.error('Failed to unpair:', error);
        }
        break;
      }

      case 'clip': {
        if (!myId) return;
        const target = msg.targetId;

        // Verify pairing
        const pairing = await PairingModel.findBetweenDevices(myId, target);
        if (!pairing) return;

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
