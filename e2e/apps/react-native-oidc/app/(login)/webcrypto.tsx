import { useEffect, useState } from "react";
import { Text, View } from "react-native";
// import { moduleWebCryptoPollyfill } from "@okta/auth-foundation";
// moduleWebCryptoPollyfill();

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function WebCryptoScreen() {
  const [out, setOut] = useState<string>("Running self-test...");

  useEffect(() => {
    const test = async () => {
      try {
        const uuid = await globalThis.crypto.randomUUID();

        const randomValue = globalThis.crypto.getRandomValues(
          new Uint8Array(16)
        );
        const data = new TextEncoder().encode("hello");
        const hash = await globalThis.crypto.subtle.digest("SHA-256", data);
        setOut(
          `uuid=${uuid}\nrandomValue=${randomValue}\nsha256(hello)=${toHex(
            hash
          )}`
        );
      } catch (error: any) {
        setOut(`Failed : ${error?.message ?? String(error)}`);
      }
    };

    test();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
      }}
    >
      <Text>{out}</Text>
    </View>
  );
}
