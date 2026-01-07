import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  TokenRefreshRequest,
  TokenRefreshResponse,
  User,
} from '@musicpub/types';
import { ApiClient } from './client';

export class AuthApi {
  constructor(private client: ApiClient) {}

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.client.post<LoginResponse>('/auth/login', credentials);
  }

  async register(data: RegisterRequest): Promise<User> {
    return this.client.post<User>('/auth/register', data);
  }

  async refreshToken(data: TokenRefreshRequest): Promise<TokenRefreshResponse> {
    return this.client.post<TokenRefreshResponse>('/auth/refresh', data);
  }

  async logout(): Promise<void> {
    return this.client.post('/auth/logout');
  }

  async getMe(): Promise<User> {
    return this.client.get<User>('/auth/me');
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    return this.client.post('/auth/password/reset', { email });
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<{ message: string }> {
    return this.client.post('/auth/password/reset/confirm', {
      token,
      new_password: newPassword,
    });
  }
}
