// ═══════════════════════════════════════════════════════════════
// API Client — REST API wrapper with token management
// ═══════════════════════════════════════════════════════════════

import { useAuthStore } from '../stores';
import type { ApiResponse } from '@anisync/shared';

const BASE_URL = 'http://localhost:3000/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const tokens = useAuthStore.getState().tokens;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (tokens?.accessToken) {
    headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    // Handle 401 — try refresh
    if (res.status === 401 && tokens?.refreshToken) {
      const refreshed = await refreshAndRetry(path, options, tokens.refreshToken);
      if (refreshed) return refreshed;
    }

    return await res.json();
  } catch (err) {
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'Sunucuya bağlanılamadı' },
    };
  }
}

async function refreshAndRetry<T>(
  path: string,
  options: RequestInit,
  refreshToken: string
): Promise<ApiResponse<T> | null> {
  try {
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshRes.ok) {
      useAuthStore.getState().logout();
      return null;
    }

    const refreshData = await refreshRes.json();
    if (refreshData.success && refreshData.data) {
      useAuthStore.getState().updateTokens(refreshData.data);

      // Retry original request with new token
      const retryRes = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshData.data.accessToken}`,
          ...(options.headers as Record<string, string> ?? {}),
        },
      });
      return await retryRes.json();
    }
  } catch {
    useAuthStore.getState().logout();
  }
  return null;
}

// ─── Public API Methods ───────────────────────────────────────

export const api = {
  // Auth
  login: (data: { usernameOrEmail: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  register: (data: { username: string; email: string; password: string; displayName: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  // Profile
  getProfile: () => request('/users/me'),
  updateProfile: (data: { displayName?: string; bio?: string; avatarUrl?: string }) =>
    request('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),

  // Rooms
  discoverRooms: (page = 1, sort = 'trending') =>
    request(`/rooms/discover?page=${page}&sort=${sort}`),
  getInviteLink: (roomId: string) =>
    request(`/rooms/${roomId}/invite`, { method: 'POST' }),
  getRoomMessages: (roomId: string, limit = 50) =>
    request(`/rooms/${roomId}/messages?limit=${limit}`),

  // Friends
  getFriends: () => request('/friends'),
  getFriendRequests: () => request('/friends/requests'),
  sendFriendRequest: (username: string) =>
    request('/friends/request', { method: 'POST', body: JSON.stringify({ username }) }),
  acceptFriendRequest: (id: string) =>
    request(`/friends/requests/${id}/accept`, { method: 'POST' }),
  rejectFriendRequest: (id: string) =>
    request(`/friends/requests/${id}/reject`, { method: 'POST' }),

  // Health
  health: () => request('/health'),
};
