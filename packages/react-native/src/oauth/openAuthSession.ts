import { Linking, NativeModules } from "react-native";

type OpenAuthSessionResult =
  | { type: "success"; url: string }
  | { type: "cancel" }
  | { type: "dismiss" }
  | { type: "locked" }
  | { type: "browser_unavailable" } //not implemented yet
  | { type: "error"; message: string };

type NativeOpenAuth = {
  openAuthSessionAsync: (
    authorizationUrl: string,
    redirectUri: string,
    preferedEphemeral?: boolean,
  ) => Promise<OpenAuthSessionResult>;
};

const Native: NativeOpenAuth | undefined = NativeModules.WebAuthNativeBridge;

console.log("WebAuthNativeBridge: ", NativeModules.WebAuthNativeBridge);

async function openAuthSessionAsyncFallback(
  authorizationUrl: string,
  redirectUri: string,
): Promise<OpenAuthSessionResult> {
  return new Promise((resolve) => {
    let done = false;

    const sub = Linking.addEventListener("url", ({ url }) => {
      if (!url || !url.startsWith(redirectUri)) {
        return;
      }

      done = true;
      sub.remove();
      resolve({ type: "success", url });
    });

    Linking.openURL(authorizationUrl).catch((e) => {
      sub.remove();
      resolve({ type: "error", message: String(e?.message ?? e) });
    });

    setTimeout(() => {
      if (done) return;
      sub.remove();
      resolve({ type: "cancel" });
    }, 5 * 60 * 1000);
  });
}

export async function openAuthSessionAsync(
  authorizationUrl: string,
  redirectUri: string,
  preferedEphemeral = false,
): Promise<OpenAuthSessionResult> {
  if (Native?.openAuthSessionAsync) {
    return Native.openAuthSessionAsync(
      authorizationUrl,
      redirectUri,
      preferedEphemeral,
    );
  }

  return openAuthSessionAsyncFallback(authorizationUrl, redirectUri);
}
