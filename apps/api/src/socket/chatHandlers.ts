import type { Server, Socket } from 'socket.io';
import { prisma } from '@adventure/database';
import { CHAT_CONSTANTS } from '@adventure/shared';
import type { ChatChannelType, ChatMessageEvent, ChatPresenceEvent } from '@adventure/shared';
import { checkRateLimit, saveMessage } from '../services/chatService';

// Throttle presence broadcasts to avoid spam on rapid connect/disconnect
let presenceTimeout: ReturnType<typeof setTimeout> | null = null;
const PRESENCE_THROTTLE_MS = 1000;

function schedulePresenceBroadcast(io: Server): void {
  if (presenceTimeout) return;
  presenceTimeout = setTimeout(() => {
    presenceTimeout = null;
    broadcastPresence(io);
  }, PRESENCE_THROTTLE_MS);
}

function broadcastPresence(io: Server): void {
  const worldRoom = io.sockets.adapter.rooms.get('chat:world');
  const worldOnline = worldRoom?.size ?? 0;

  const zoneOnline: Record<string, number> = {};
  for (const [roomName, room] of io.sockets.adapter.rooms) {
    if (roomName.startsWith('chat:zone:')) {
      const zoneId = roomName.slice('chat:zone:'.length);
      zoneOnline[zoneId] = room.size;
    }
  }

  const event: ChatPresenceEvent = { worldOnline, zoneOnline };
  io.to('chat:world').emit('chat:presence', event);
}

const VALID_CHANNEL_TYPES = new Set<ChatChannelType>(['world', 'zone']);

export function registerChatHandlers(io: Server, socket: Socket): void {
  const { playerId, username } = socket.data;

  // Join world room
  socket.join('chat:world');

  // Look up player's current zone and join it
  prisma.player
    .findUnique({ where: { id: playerId }, select: { currentZoneId: true } })
    .then((player) => {
      if (player?.currentZoneId) {
        socket.join(`chat:zone:${player.currentZoneId}`);
      }
      schedulePresenceBroadcast(io);
    })
    .catch(() => {
      // Best-effort — presence will update on next event
    });

  // Handle chat:send
  socket.on('chat:send', async (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const { channelType, channelId, message } = payload as Record<string, unknown>;

    if (typeof channelType !== 'string' || typeof channelId !== 'string' || typeof message !== 'string') return;
    if (!VALID_CHANNEL_TYPES.has(channelType as ChatChannelType)) return;

    // Derive the expected room and verify the socket is a member
    const room = `chat:${channelId}`;
    if (!socket.rooms.has(room)) {
      socket.emit('chat:error', { code: 'NOT_IN_CHANNEL', message: 'You are not in that channel.' });
      return;
    }

    const trimmed = message.trim();
    if (!trimmed || trimmed.length > CHAT_CONSTANTS.MAX_MESSAGE_LENGTH) return;

    if (!checkRateLimit(playerId, channelType as ChatChannelType)) {
      socket.emit('chat:error', { code: 'RATE_LIMITED', message: 'Sending too fast, slow down.' });
      return;
    }

    const saved = await saveMessage({
      channelType: channelType as ChatChannelType,
      channelId,
      playerId,
      username,
      message: trimmed,
    });

    const event: ChatMessageEvent = {
      id: saved.id,
      channelType: channelType as ChatChannelType,
      channelId,
      playerId,
      username,
      message: trimmed,
      createdAt: saved.createdAt.toISOString(),
    };

    io.to(room).emit('chat:message', event);
  });

  // Handle zone switching (when player travels)
  socket.on('chat:switch-zone', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const { zoneId } = payload as Record<string, unknown>;
    if (typeof zoneId !== 'string') return;

    // Leave all current zone rooms
    for (const room of socket.rooms) {
      if (room.startsWith('chat:zone:')) {
        socket.leave(room);
      }
    }

    socket.join(`chat:zone:${zoneId}`);
    schedulePresenceBroadcast(io);
  });

  socket.on('disconnect', () => {
    schedulePresenceBroadcast(io);
  });
}
