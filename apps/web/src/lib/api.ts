const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ApiResponse<T> {
  data?: T;
  error?: { message: string; code: string };
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const json = await res.json();

    if (!res.ok) {
      return { error: json.error || { message: 'Unknown error', code: 'UNKNOWN' } };
    }

    return { data: json };
  } catch (err) {
    return { error: { message: 'Network error', code: 'NETWORK_ERROR' } };
  }
}

// Auth
export async function register(username: string, email: string, password: string) {
  return fetchApi<{
    player: { id: string; username: string; email: string };
    accessToken: string;
    refreshToken: string;
  }>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

export async function login(email: string, password: string) {
  return fetchApi<{
    player: { id: string; username: string; email: string };
    accessToken: string;
    refreshToken: string;
  }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function refreshToken(token: string) {
  return fetchApi<{ accessToken: string; refreshToken: string }>('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: token }),
  });
}

// Player
export async function getPlayer() {
  return fetchApi<{
    player: { id: string; username: string; email: string; createdAt: string };
  }>('/api/v1/player');
}

export async function getSkills() {
  return fetchApi<{
    skills: Array<{
      skillType: string;
      level: number;
      xp: number;
      dailyXpGained: number;
    }>;
  }>('/api/v1/player/skills');
}

// Turns
export async function getTurns() {
  return fetchApi<{
    currentTurns: number;
    timeToCapMs: number | null;
    lastRegenAt: string;
  }>('/api/v1/turns');
}

export async function spendTurns(amount: number, reason?: string) {
  return fetchApi<{
    previousTurns: number;
    spent: number;
    currentTurns: number;
  }>('/api/v1/turns/spend', {
    method: 'POST',
    body: JSON.stringify({ amount, reason }),
  });
}
