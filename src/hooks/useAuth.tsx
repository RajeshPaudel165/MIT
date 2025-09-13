import { useContext } from 'react';
import { AuthContext } from '@/hooks/auth-context-type';
import { AuthProvider } from '@/components/AuthProviderWrapper';

export { AuthProvider };

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}