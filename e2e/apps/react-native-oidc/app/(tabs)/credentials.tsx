import { useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Credential } from '@okta/react-native-platform';
import type { Token } from '@okta/react-native-platform';

type CredentialItem = {
  id: string;
  token: Token;
  isDefault: boolean;
};

export default function CredentialsScreen() {
  const router = useRouter();
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCredentials = useCallback(async () => {
    try {
      const allCredentials = await Promise.all(
        (await Credential.allIDs()).map((id) => Credential.with(id))
      ) as Credential[];
      const defaultCred = await Credential.getDefault();
      
      const items: CredentialItem[] = await Promise.all(
        allCredentials.map(async (cred) => ({
          id: cred.id,
          token: cred.token,
          isDefault: cred.id === defaultCred?.id,
        }))
      );
      
      setCredentials(items);
    } catch (err) {
      console.error('Failed to load credentials:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadCredentials();
    }, [loadCredentials])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCredentials();
  }, [loadCredentials]);

  const handleCredentialPress = (credentialId: string) => {
    router.push({
      pathname: '/(tabs)/token',
      params: { id: credentialId },
    });
  };

  if (loading) {
    return (
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
        headerImage={
          <IconSymbol
            size={310}
            color="#808080"
            name="paperplane.fill"
            style={styles.headerImage}
          />
        }>
        <ThemedView style={styles.centerContainer}>
          <ActivityIndicator size="large" />
          <ThemedText>Loading credentials...</ThemedText>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="paperplane.fill"
          style={styles.headerImage}
        />
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Credentials</ThemedText>
      </ThemedView>

      {credentials.length === 0 ? (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText>No credentials found.</ThemedText>
          <ThemedText style={styles.emptyHint}>
            Sign in from the Auth tab to create a credential.
          </ThemedText>
        </ThemedView>
      ) : (
        <ThemedView style={styles.listContainer}>
          <ThemedText style={styles.countText}>
            {credentials.length} credential{credentials.length !== 1 ? 's' : ''} stored
          </ThemedText>
          
          {credentials.map((cred) => (
            <TouchableOpacity
              key={cred.id}
              style={styles.credentialCard}
              onPress={() => handleCredentialPress(cred.id)}>
              <ThemedView style={styles.credentialHeader}>
                <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.credentialId}>
                  {cred.id.substring(0, 12)}...
                </ThemedText>
                {cred.isDefault && (
                  <ThemedView style={styles.defaultBadge}>
                    <ThemedText style={styles.defaultBadgeText}>DEFAULT</ThemedText>
                  </ThemedView>
                )}
              </ThemedView>
              
              <ThemedView style={styles.credentialDetails}>
                <ThemedText style={styles.detailText}>
                  Expires: {new Date(cred.token.expiresAt).toLocaleString()}
                </ThemedText>
                <ThemedText style={styles.detailText}>
                  Type: {cred.token.tokenType}
                </ThemedText>
                {cred.token.scopes && (
                  <ThemedText style={styles.detailText} numberOfLines={1}>
                    Scopes: {cred.token.scopes.join(', ')}
                  </ThemedText>
                )}
              </ThemedView>
              
              <ThemedText style={styles.tapHint}>Tap to view details →</ThemedText>
            </TouchableOpacity>
          ))}
        </ThemedView>
      )}
    </ParallaxScrollView>
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
  emptyContainer: {
    alignItems: 'center',
    gap: 8,
    padding: 32,
  },
  emptyHint: {
    opacity: 0.7,
    textAlign: 'center',
  },
  listContainer: {
    gap: 12,
  },
  countText: {
    opacity: 0.7,
    marginBottom: 8,
  },
  credentialCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f522',
    borderWidth: 1,
    borderColor: '#e0e0e033',
    gap: 12,
  },
  credentialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  credentialId: {
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: '#34c75922',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#34c759',
  },
  credentialDetails: {
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    opacity: 0.8,
  },
  tapHint: {
    fontSize: 12,
    opacity: 0.5,
    textAlign: 'right',
  },
});
