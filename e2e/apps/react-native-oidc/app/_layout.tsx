import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import * as Crypto from 'expo-crypto';

import { useColorScheme } from '@/hooks/useColorScheme';


// temp polyfill crypto libs
global.crypto = {
  // @ts-ignore
  getRandomValues (typedArray: Uint8Array) {
    return Crypto.getRandomValues(typedArray);
  },
  // @ts-ignore
  randomUUID () {
    return Crypto.randomUUID();
  },
  // @ts-ignore
  subtle: {
    digest (alg, data) {
      // @ts-ignore
      return Crypto.digest(alg, data);
    }
  }
}



export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(login)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
