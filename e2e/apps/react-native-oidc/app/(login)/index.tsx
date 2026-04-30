import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Button } from 'react-native';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import { useAuth } from '@/hooks/useAuth';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HelloWave } from '@/components/HelloWave';


export default function LoginScreen () {
  const { signIn } = useAuth();
  const [ authError, setAuthError ] = useState<Error | null>(null);

  const signInFunc = useCallback(async () => {
    try {
      await signIn('/(login)/token');
    }
    catch (err) {
      setAuthError(err as Error);
    }
  }, [signIn, setAuthError]);

  useEffect(() => {
    (async () => {
      await signInFunc();
    })();
  }, [signInFunc]);

  let view  = (
    <>
      <ThemedText type="title">Loading...</ThemedText>
      <HelloWave />
    </>
  );

  if (authError) {
    view = (
      <>
        <ThemedText type="title">Error</ThemedText>
        <ThemedText type="default">{authError.message}</ThemedText>
        <Button
          title="Login"
          onPress={() => { setAuthError(null); signInFunc(); }}
        />
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
      <ThemedView style={styles.titleContainer}>
        {view}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Constants.statusBarHeight,
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
