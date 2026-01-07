import { ApiClient, AuthApi, WorksApi, DealsApi, RoyaltiesApi } from '@musicpub/api-client';
import { useAuthStore } from '@/stores/auth';

// Create API client with auth handling
const apiClient = new ApiClient({
  baseUrl: '/api',
  getAccessToken: () => useAuthStore.getState().accessToken,
  onUnauthorized: () => {
    useAuthStore.getState().logout();
    window.location.href = '/login';
  },
});

// Export API instances
export const authApi = new AuthApi(
  new ApiClient({
    baseUrl: '/api/auth',
    getAccessToken: () => useAuthStore.getState().accessToken,
  })
);

export const worksApi = new WorksApi(
  new ApiClient({
    baseUrl: '/api/works',
    getAccessToken: () => useAuthStore.getState().accessToken,
  })
);

export const dealsApi = new DealsApi(
  new ApiClient({
    baseUrl: '/api/deals',
    getAccessToken: () => useAuthStore.getState().accessToken,
  })
);

export const royaltiesApi = new RoyaltiesApi(
  new ApiClient({
    baseUrl: '/api/royalties',
    getAccessToken: () => useAuthStore.getState().accessToken,
  })
);
