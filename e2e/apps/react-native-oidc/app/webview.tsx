import { useEffect, useState } from 'react';
import { Button, StyleSheet, ActivityIndicator } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { WebView } from 'react-native-webview'; 
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Credential } from '@okta/react-native-platform';
import { InterclientAccessFlow } from '@okta/react-native-platform/flows';
import { client } from '@/auth';


export default function WebViewScreen () {
  const [interclientToken, setInterclientToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getInterclientToken = async () => {
    try {
      setLoading(true);
      setError(null);

      const flow = new InterclientAccessFlow(client, {
        bootstrapUrl: 'http://localhost:8080/native/sso',
        targetWebAppClientId: '0oahoub0n9vz0nSvC1d7'
      });

      const credential = await Credential.getDefault();
      if (credential) {
        const interclientAT = await flow.launch(credential.token);
        console.log(interclientAT)
        setInterclientToken(interclientAT);
      }
      else {
        setError('No credential available');
      }
    }
    catch (err) {
      setError((err as Error)?.message ?? 'unknown error');
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getInterclientToken();
  }, []);

  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText>Error: {error}</ThemedText>
        <Button accessibilityLabel="reloadErrorButton" title="Reload" onPress={getInterclientToken} />
      </ThemedView>
    );
  }

  if (!interclientToken) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText>Error: No Interclient Token found</ThemedText>
        <Button accessibilityLabel="reloadErrorButton" title="Reload" onPress={getInterclientToken} />
      </ThemedView>
    )
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText>Interclient Token: {interclientToken}</ThemedText>
      <WebView
        source={{ uri: 'https://okta.com' }}
        style={{ flex: 1 }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flex: 1,
    padding: 20
  },
  centerContainer: {
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
});
