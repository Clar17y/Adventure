export type ChatChannelType = 'world' | 'zone' | 'guild';

export interface ChatSendPayload {
  channelType: ChatChannelType;
  channelId: string;
  message: string;
}

export interface ChatMessageEvent {
  id: string;
  channelType: ChatChannelType;
  channelId: string;
  playerId: string;
  username: string;
  message: string;
  createdAt: string;
}

export interface ChatPresenceEvent {
  worldOnline: number;
  zoneOnline: Record<string, number>;
}

export interface ChatErrorEvent {
  code: string;
  message: string;
}
