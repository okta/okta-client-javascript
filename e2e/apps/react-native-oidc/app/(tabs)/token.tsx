import { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, Button } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Credential } from '@okta/react-native-platform';
import type { Token } from '@okta/react-native-platform';

export default function TokenScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const [token, setToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadToken();
    }, [params.id])
  );

  const loadToken = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let credential;
      if (params.id) {
        credential = await Credential.with(params.id);
      } else {
        credential = await Credential.getDefault();
      }

      if (credential) {
        setToken(credential.token);
      } else {
        let errMsg = 'No credential found';
        if (params.id) {
          errMsg += ` (${params.id})`;
        }
        setError(errMsg);
      }
    } catch (err) {
      console.error('Failed to load token:', err);
      setError(err instanceof Error ? err.message : 'Failed to load token');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (token) {
      const cred = await Credential.with(token.id);
      await cred?.revoke();
      router.navigate('/credentials')
    }
  }

  if (loading) {
    return (
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
        headerImage={
          <IconSymbol
            size={310}
            color="#808080"
            name="chevron.left.forwardslash.chevron.right"
            style={styles.headerImage}
          />
        }>
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" />
          <ThemedText>Loading token...</ThemedText>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  if (error || !token) {
    return (
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
        headerImage={
          <IconSymbol
            size={310}
            color="#808080"
            name="chevron.left.forwardslash.chevron.right"
            style={styles.headerImage}
          />
        }>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">Token Details</ThemedText>
        </ThemedView>
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>
            {error || `No token selected (${params.id})`}
          </ThemedText>
          <ThemedText style={styles.hintText}>
            Go to Credentials tab and select a credential
          </ThemedText>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  const tokenData = token.toJSON();
  const isExpired = token.isExpired;
  const expiresIn = Math.floor((new Date(token.expiresAt).getTime() - Date.now()) / 1000);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Token Details</ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Status</ThemedText>
        <ThemedView style={styles.statusContainer}>
          <ThemedText style={isExpired ? styles.expired : styles.valid}>
            {isExpired ? '❌ Expired' : '✅ Valid'}
          </ThemedText>
          {!isExpired && (
            <ThemedText style={styles.expiresText}>
              Expires in {Math.floor(expiresIn / 60)} minutes
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Token ID</ThemedText>
        <ThemedView style={styles.codeBlock}>
          <ThemedText style={styles.codeText} selectable>
            {token.id}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Properties</ThemedText>
        <ThemedView style={styles.propertyContainer}>
          <Property label="Type" value={token.tokenType} />
          <Property label="Issued At" value={new Date(token.issuedAt).toLocaleString()} />
          <Property label="Expires At" value={new Date(token.expiresAt).toLocaleString()} />
          {token.scopes && <Property label="Scopes" value={token.scopes.join(', ')} />}
        </ThemedView>
      </ThemedView>

      {token.context && Object.keys(token.context).length > 0 && (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Context</ThemedText>
          <ThemedView style={styles.codeBlock}>
            <ScrollView horizontal>
              <ThemedText style={styles.codeText} selectable>
                {JSON.stringify(token.context, null, 2)}
              </ThemedText>
            </ScrollView>
          </ThemedView>
        </ThemedView>
      )}

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Access Token (truncated)</ThemedText>
        <ThemedView style={styles.codeBlock}>
          <ThemedText style={styles.codeText} selectable numberOfLines={3}>
            {token.accessToken}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      {token?.idToken && (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">ID Token (truncated)</ThemedText>
          <ThemedView style={styles.codeBlock}>
            <ThemedText style={styles.codeText} selectable numberOfLines={3}>
              {token?.idToken?.rawValue}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      )}

      {token?.refreshToken && (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Refresh Token</ThemedText>
          <ThemedView style={styles.codeBlock}>
            <ThemedText style={styles.codeText} selectable numberOfLines={3}>
              {token.refreshToken}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      )}

      <ThemedView style={styles.section}>
        <Button title="Revoke Token" onPress={handleRevoke} />
      </ThemedView>
    </ParallaxScrollView>
  );
}

function Property({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView style={styles.property}>
      <ThemedText style={styles.propertyLabel}>{label}:</ThemedText>
      <ThemedText style={styles.propertyValue}>{value}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  centerContainer: {
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  errorContainer: {
    padding: 20,
    gap: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 16,
  },
  hintText: {
    opacity: 0.7,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    gap: 8,
  },
  statusContainer: {
    gap: 4,
  },
  valid: {
    color: '#34c759',
    fontSize: 16,
    fontWeight: 'bold',
  },
  expired: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: 'bold',
  },
  expiresText: {
    opacity: 0.7,
  },
  codeBlock: {
    backgroundColor: '#f5f5f522',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e033',
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  propertyContainer: {
    gap: 8,
  },
  property: {
    flexDirection: 'row',
    gap: 8,
  },
  propertyLabel: {
    fontWeight: 'bold',
    minWidth: 100,
  },
  propertyValue: {
    flex: 1,
    opacity: 0.8,
  },
});
