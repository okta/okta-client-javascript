import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";
import { useEffect } from "react";

import { setupWebCryptoPolyfill } from "../../../../packages/react-native-webcrypto-poc/src/webCryptoPolyfill";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    const test = async () => {
      const data = new TextEncoder().encode("hello world");
      const buff = await (globalThis.crypto as any).subtle.digest(
        "SHA-256",
        data
      );
      console.log("digest lenght", (buff as ArrayBuffer).byteLength);
    };
    test().catch((e) => console.error("Digest test failed", e));
  }, []);

  useEffect(() => {
    const test2 = async () => {
      console.log("Testing crypto.randomUUID()");

      const uuid = crypto.randomUUID();
      console.log("Generated UUID:", uuid);

      //Validation test
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      console.log("Passing randomUUID test: ", uuidRegex.test(uuid));
      return null;
    };

    test2().catch((e) => console.error("randomUUID test failed", e));
  }, []);

  useEffect(() => {
    const test3 = async () => {
      console.log("Testing crypto.getRandomValues()");

      const arr = new Uint8Array(16);

      crypto.getRandomValues(arr);

      console.log("Generated random Uint8Array:", arr);

      const allZero = arr.every((value) => value === 0);

      console.log("Passing getRandomValues test (not all zeros): ", !allZero);
      return null;
    };

    test3().catch((e) => console.error("getRandomValues test failed", e));
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(login)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
