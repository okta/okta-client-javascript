import { useEffect, useState } from 'react';
import { Button, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Credential, Token } from '@okta/react-native-platform';
import { useAuth } from '@/hooks/useAuth';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HelloWave } from '@/components/HelloWave';


export default function CredentialsScreen () {
  const router = useRouter();
  const { signOut } = useAuth();
  const [credentialIDs, setCredentialIDs] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      console.log('credentials.tsx useEffect')
      try {
        const allIds = await Credential.allIDs();
        setCredentialIDs(allIds);
      }
      catch (err) {
        console.log('error');
        console.log(err, (err as Error)?.stack);
        throw err;
      }
    })();
  }, [router, setCredentialIDs]);

  let body = (
    <ThemedView style={styles.titleContainer}>
      <ThemedText type="title">Loading...</ThemedText>
      <HelloWave />
    </ThemedView>
  );

  if (credentialIDs.length > 0) {
   body = (
      <>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">Credentials</ThemedText>
        </ThemedView>
        {credentialIDs.map((id) => (
          <ThemedView key={id} style={styles.stepContainer}>
            <ThemedText type="subtitle">{id}</ThemedText>
          </ThemedView>
        ))}
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
