import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

export default function CallbackScreen() {
  const router = useRouter();

  // useEffect(() => {
  //   // Redirect back to home after a short delay to let the OAuth flow complete
  //   const timer = setTimeout(() => {
  //     router.replace('/');
  //   }, 500);

  //   return () => clearTimeout(timer);
  // }, [router]);

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
