import { AuthProvider as RealAuthProvider } from '@/hooks/auth-context';

// Export a wrapper component for the AuthProvider
export function AuthProvider(props: React.ComponentProps<typeof RealAuthProvider>) {
  return <RealAuthProvider {...props} />;
}
