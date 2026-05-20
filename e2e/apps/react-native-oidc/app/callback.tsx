import { useEffect } from 'react';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/hooks/useAuth';


export default function CallbackScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<Record<string, string>>();
  const { handleAuthFlowExchange } = useAuth();


  console.log('search params: ', searchParams);
  const handleExchange = async () => {
    const params = { ...searchParams };
    await handleAuthFlowExchange(new URLSearchParams(params));
    router.replace('/');
  }

  useEffect(() => {
    handleExchange();
  }, [router]);

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="large" />
      <ThemedText>Processing login...</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
