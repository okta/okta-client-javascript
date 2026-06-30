import { useCallback } from 'react';
import { useRouter, type Router, usePathname } from 'expo-router';
import { performSignIn, performSignOut } from '@/auth';


export function useAuth () {
  const router = useRouter();
  const pathname = usePathname();

  const signIn = useCallback(async (originalUri?: string) => {
    const credential = await performSignIn();
    if (credential) {
      console.log('pathname: ', pathname);
      router.replace(originalUri ?? pathname);
      return credential.id;
    }
  }, [router]);

  const signOut = useCallback(async (redirectTo: Parameters<Router['navigate']>[0]) => {
    await performSignOut();
    router.navigate(redirectTo);
  }, [router]);

  return { signIn, signOut };
};