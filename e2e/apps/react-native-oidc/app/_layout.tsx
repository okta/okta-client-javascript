import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import * as Crypto from "expo-crypto";

import { useColorScheme } from "@/hooks/useColorScheme";
import { useEffect } from "react";

const toExpoDigestAlgo = (
  algorithm: AlgorithmIdentifier
): Crypto.CryptoDigestAlgorithm => {
  const name =
    typeof algorithm === `string`
      ? algorithm
      : (algorithm as { name: string }).name;

  switch (name.toUpperCase()) {
    case "SHA-256":
      return Crypto.CryptoDigestAlgorithm.SHA256;
    case "SHA-384":
      return Crypto.CryptoDigestAlgorithm.SHA384;
    case "SHA-512":
      return Crypto.CryptoDigestAlgorithm.SHA512;

    default:
      throw new Error(`Unsuported algorithm: ${name}`);
  }
};

// temp polyfill crypto libs
global.crypto = {
  // @ts-ignore
  getRandomValues(typedArray: Uint8Array) {
    return Crypto.getRandomValues(typedArray);
  },
  // @ts-ignore
  randomUUID() {
    return Crypto.randomUUID();
  },
  // @ts-ignore
  subtle: {
    digest(
      algorithm: AlgorithmIdentifier,
      data: BufferSource
    ): Promise<ArrayBuffer> {
      // @ts-ignore

      const expoAlg = toExpoDigestAlgo(algorithm);

      let bytes: Uint8Array;

      if (data instanceof ArrayBuffer) {
        bytes = new Uint8Array(data);
      } else if (ArrayBuffer.isView(data)) {
        const view = data as ArrayBufferView;
        bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
      } else {
        throw new TypeError(
          "[subtle.digest] data must be ArrayBuffer or TypedArray"
        );
      }

      return Crypto.digest(expoAlg, bytes as any);
    },
  },
};

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
      const array = new Uint8Array(16);
      globalThis.crypto.a(array);
      console.log("Random values:", array);
    };
    test2().catch((e) => console.error("getRandomValues test failed", e));
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
