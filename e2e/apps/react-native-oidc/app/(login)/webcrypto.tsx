import { useEffect, useState } from "react";
import { Text, View } from "react-native";

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toB64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
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

        const hmacKey = await globalThis.crypto.subtle.generateKey(
          { name: "HMAC", hash: { name: "SHA-256" }, length: 256 },
          true,
          ["sign"]
        );

        const hmacSig = await globalThis.crypto.subtle.sign(
          { name: "HMAC", hash: { name: "SHA-256" } },
          hmacKey,
          data
        );

        const hmacSigHex = toHex(hmacSig);

        if (hmacKey?.format !== "raw" || typeof hmacKey?.data !== "string") {
          throw new Error(
            `Unexpected HMAC key shape ${JSON.stringify(hmacKey)}`
          );
        }

        const rawKeyBytesB64 = hmacKey.data;

        const rawKeyBytes = () => {
          const s = globalThis.atob(rawKeyBytesB64);
          const u8 = new Uint8Array(s.length);
          for (let i = 0; i < s.length; i++) {
            u8[i] = s.charCodeAt(i);
          }
          return u8.buffer;
        };

        const importedHmacKey = await globalThis.crypto.subtle.importKey(
          "raw",
          rawKeyBytes(),
          { name: "HMAC", hash: { name: "SHA-256" } },
          true,
          ["sign"]
        );

        const hmacSig2 = await globalThis.crypto.subtle.sign(
          { name: "HMAC", hash: { name: "SHA-256" } },
          importedHmacKey,
          data
        );

        const sameSig = toHex(hmacSig2) === toHex(hmacSig);

        setOut(
          `uuid=${uuid}\n` +
            `randomValue=${randomValue}\n` +
            `sha256(hello)=${toHex(hash)}\n` +
            `HMAC key format=${hmacKey?.format}\n` +
            `HMAC sig (hex)=${hmacSigHex}\n` +
            `HMAC importKey key format=${importedHmacKey?.format} and works=${sameSig}\n`
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
