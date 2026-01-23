import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { buildAuthorizeUrl } from "@okta/react-native";
import Constants from "expo-constants";

function getConfig() {
  const env = Constants.expoConfig?.extra?.env ?? {};
  const issuer = (env.ISSUER as string | undefined) ?? "";
  const clientId = (env.NATIVE_CLIENT_ID as string | undefined) ?? "";
  const redirectUri = (env.REDIRECT_URI as string | undefined) ?? "";

  const sessionToken = (env.SESSION_TOKEN as string | undefined) ?? "";

  return { issuer, clientId, redirectUri, sessionToken };
}

export default function AuthorizeUrlScreen() {
  const [out, setOut] = useState<string>("Running self-test...");
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const test = async () => {
      try {
        setErr("");
        const { issuer, clientId, redirectUri, sessionToken } = getConfig();

        const response = await buildAuthorizeUrl({
          issuer,
          clientId,
          redirectUri,
          scopes: ["openid", "profile", "offline_access"],
          ...(sessionToken ? { sessionToken } : {}),
        });

        let log = "";

        log += `issuer: ${issuer}\n\n`;
        log += `clientId: ${clientId}\n\n`;
        log += `redirectUri: ${redirectUri}\n\n`;
        log += `sessionToken: ${sessionToken ? "(set)" : "(not set)"}\n\n`;

        log += `authorize url: ${response.url}\n\n`;
        log += `codeVerifier (store this for tocken exchange) url: ${response.codeVerifier}\n\n`;

        if (sessionToken) {
          log += `\n\nsanity:\n`;
          log += response.url.includes("sessionToken")
            ? "sessionToken is present in authorize URL"
            : "sessionToken is not present in authorize URL";
        }

        console.log(log);

        if (!cancelled) setOut(log);
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message ?? String(e));
        setOut("Failed to build authorize URL");
      }
    };

    test().then(() => {
      cancelled = true;
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>{err}</Text>
      <Text>{out}</Text>
    </View>
  );
}
