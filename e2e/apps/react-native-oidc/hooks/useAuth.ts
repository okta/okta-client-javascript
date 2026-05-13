import { useCallback } from 'react';
import { useRouter, type Router, usePathname } from 'expo-router';
import { performSignIn, performSignOut, handleAuthFlowCallback } from '@/auth';


export function useAuth () {
  const router = useRouter();
  const pathname = usePathname();

  const signIn = useCallback(async () => {
    const id = await performSignIn();
    console.log('pathname: ', pathname);
    return id;
  }, [router]);

  const signOut = useCallback(async (redirectTo: Parameters<Router['navigate']>[0]) => {
    await performSignOut();
    router.navigate(redirectTo);
  }, [router]);

  const handleAuthFlowExchange = useCallback(async (params: URLSearchParams) => {
    return await handleAuthFlowCallback(params);
  }, [])

  return { signIn, signOut, handleAuthFlowExchange };
};