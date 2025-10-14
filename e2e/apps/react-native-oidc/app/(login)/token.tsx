import { useEffect, useState } from 'react';
import { Button, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Credential, Token } from '@okta/auth-foundation';
import { useAuth } from '@/hooks/useAuth';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HelloWave } from '@/components/HelloWave';


export default function TokenScreen () {
  const router = useRouter();
  const { signOut } = useAuth();
  const [token, setToken] = useState<Token | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const credential = await Credential.getDefault();
        if (credential) {
          setToken(credential.token);
        }
        else {
          router.navigate('/(login)');
        }
      }
      catch (err) {
        console.log('error');
        console.log(err, (err as Error)?.stack);
        throw err;
      }
    })();
  }, [router, token, setToken]);

  let body = (
    <ThemedView style={styles.titleContainer}>
      <ThemedText type="title">Loading...</ThemedText>
      <HelloWave />
    </ThemedView>
  );

  if (token) {
   body = (
    <>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Token</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Access Token</ThemedText>
        <ThemedText>{token.accessToken}</ThemedText>
        <ThemedText type="subtitle">Refresh Token</ThemedText>
        <ThemedText>{token?.refreshToken}</ThemedText>
      </ThemedView>
      <ThemedView>
      <Button
          title="Logout"
          onPress={async () => await signOut('/(tabs)')}
        />
      </ThemedView>
    </>
   );
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      {body}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Constants.statusBarHeight,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
