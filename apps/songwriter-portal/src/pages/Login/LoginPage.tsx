import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Music, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
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
    <div className="min-h-screen flex items-center justify-center bg-studio-bg relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent-indigo/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-violet/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-indigo/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 glass-card relative z-10 mx-4"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 gradient-primary rounded-studio-lg flex items-center justify-center shadow-glow-md mb-4">
            <Music className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">Songwriter Portal</h1>
          <p className="text-sm text-text-tertiary mt-1">Music Publishing</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
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
            <label className="block text-xs font-medium text-text-secondary mb-2">
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
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-status-error bg-status-error/10 px-3 py-2 rounded-studio"
            >
              {error}
            </motion.p>
          )}

          <Button
            type="submit"
            variant="gradient"
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

        <p className="mt-6 text-center text-xs text-text-tertiary">
          Access your royalty statements and earnings
        </p>
      </motion.div>
    </div>
  );
}
