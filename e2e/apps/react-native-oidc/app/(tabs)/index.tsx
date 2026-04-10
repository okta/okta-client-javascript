import { Image } from 'expo-image';
import { useState, useCallback } from 'react';
import { Button, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/hooks/useAuth';
import { Credential } from '@okta/react-native-platform';

export default function AuthScreen() {
  const { signIn, signOut } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      checkAuth();
    }, [])
  );

  const checkAuth = async () => {
    try {
      setLoading(true);
      const credential = await Credential.getDefault();
      setIsAuthenticated(!!credential);
    } catch (err) {
      console.error('Error checking auth:', err);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signIn();
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Sign in failed:', err);
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      setError(null);
      await signOut('/(tabs)');
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Sign out failed:', err);
      setError(err instanceof Error ? err.message : 'Sign out failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Authentication</ThemedText>
        <HelloWave />
      </ThemedView>

      {loading ? (
        <ThemedView style={styles.stepContainer}>
          <ActivityIndicator size="large" />
          <ThemedText>Loading...</ThemedText>
        </ThemedView>
      ) : (
        <>
          <ThemedView style={styles.stepContainer}>
            <ThemedText type="subtitle">
              Status: {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
            </ThemedText>
          </ThemedView>

          {error && (
            <ThemedView style={[styles.stepContainer, styles.errorContainer]}>
              <ThemedText style={styles.errorText}>Error: {error}</ThemedText>
            </ThemedView>
          )}

          <ThemedView style={styles.stepContainer}>
            <Button title="Request Token" onPress={handleSignIn} />
            <Button title="Sign Out" onPress={handleSignOut} color="#ff3b30" />
          </ThemedView>

          <ThemedView style={styles.stepContainer}>
            <ThemedText type="defaultSemiBold">Next Steps:</ThemedText>
            <ThemedText>
              {isAuthenticated 
                ? '• Go to Credentials tab to see all stored tokens\n• Select a credential to view token details'
                : '• Sign in to get started\n• Your tokens will be stored securely in the keychain'}
            </ThemedText>
          </ThemedView>
        </>
      )}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  errorContainer: {
    padding: 12,
    backgroundColor: '#ff3b3022',
    borderRadius: 8,
  },
  errorText: {
    color: '#ff3b30',
  },
});