import { ApiClient, AuthApi, RoyaltiesApi } from '@musicpub/api-client';
import { useAuthStore } from '@/stores/auth';

export const authApi = new AuthApi(
  new ApiClient({
    baseUrl: '/api/auth',
    getAccessToken: () => useAuthStore.getState().accessToken,
  })
);

export const royaltiesApi = new RoyaltiesApi(
  new ApiClient({
    baseUrl: '/api/royalties',
    getAccessToken: () => useAuthStore.getState().accessToken,
    onUnauthorized: () => {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    },
  })
);
