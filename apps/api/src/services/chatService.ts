import { prisma } from '@adventure/database';
import { CHAT_CONSTANTS } from '@adventure/shared';
import type { ChatChannelType, ChatMessageEvent } from '@adventure/shared';

// In-memory rate limiter: key = "playerId:channelType" → last send timestamp
const lastSendTimes = new Map<string, number>();

export function checkRateLimit(playerId: string, channelType: ChatChannelType): boolean {
  const key = `${playerId}:${channelType}`;
  const now = Date.now();
  const lastSend = lastSendTimes.get(key);
  const limitMs = channelType === 'world'
    ? CHAT_CONSTANTS.WORLD_RATE_LIMIT_MS
    : CHAT_CONSTANTS.ZONE_RATE_LIMIT_MS;

  if (lastSend && now - lastSend < limitMs) {
    return false;
  }

  lastSendTimes.set(key, now);
  return true;
}

export async function saveMessage(params: {
  channelType: ChatChannelType;
  channelId: string;
  playerId: string;
  username: string;
  message: string;
}): Promise<{ id: string; createdAt: Date }> {
  const truncated = params.message.slice(0, CHAT_CONSTANTS.MAX_MESSAGE_LENGTH);

  const row = await prisma.chatMessage.create({
    data: {
      channelType: params.channelType,
      channelId: params.channelId,
      playerId: params.playerId,
      username: params.username,
      message: truncated,
    },
    select: { id: true, createdAt: true },
  });

  return row;
}

export async function getChannelHistory(
  channelType: string,
  channelId: string,
): Promise<ChatMessageEvent[]> {
  const rows = await prisma.chatMessage.findMany({
    where: { channelType, channelId },
    orderBy: { createdAt: 'desc' },
    take: CHAT_CONSTANTS.HISTORY_LIMIT,
  });

  // Reverse so oldest first for display
  return rows.reverse().map((r) => ({
    id: r.id,
    channelType: r.channelType as ChatChannelType,
    channelId: r.channelId,
    playerId: r.playerId,
    username: r.username,
    message: r.message,
    createdAt: r.createdAt.toISOString(),
  }));
}
