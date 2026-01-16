import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Music, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { authApi, royaltiesApi } from '@/lib/api';
import { Button } from '@/components/Button';

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: async () => {
      // Login
      const authResponse = await authApi.login({ email, password });

      // Set token temporarily to fetch songwriter info
      useAuthStore.setState({ accessToken: authResponse.access_token });

      // Get user info and songwriter profile
      const user = await authApi.getMe();

      // For demo, we'll get the first songwriter - in production this would be linked to user
      const songwriters = await royaltiesApi.listSongwriters({ limit: 1 });
      const songwriter = songwriters[0];

      if (!songwriter) {
        throw new Error('No songwriter profile found for this account');
      }

      return {
        user,
        songwriter,
        accessToken: authResponse.access_token,
        refreshToken: authResponse.refresh_token,
      };
    },
    onSuccess: (data) => {
      setAuth(data.user, data.songwriter, data.accessToken, data.refreshToken);
      navigate('/dashboard');
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Login failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-notion-bg-secondary">
      <div className="w-full max-w-sm p-8 bg-white rounded-notion-lg shadow-notion-popup">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-notion-green-bg rounded-notion-md flex items-center justify-center">
            <Music className="w-5 h-5 text-notion-green-text" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-notion-text">Songwriter Portal</h1>
            <p className="text-xs text-notion-text-tertiary">Music Publishing</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-notion-text mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base"
              placeholder="songwriter@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-notion-text mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-base"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p className="text-xs text-notion-red-text">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-notion-text-tertiary">
          Access your royalty statements and earnings
        </p>
      </div>
    </div>
  );
}
