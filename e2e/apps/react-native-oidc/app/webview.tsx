import { Button, StyleSheet, ActivityIndicator } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { InterclientAccessFlow } from '@okta/react-native-platform/flows';
import { SSOWebView } from '@okta/react-native-platform/webview';
import { client } from '@/auth';


// Module scope keeps `flow` referentially stable. A new instance would trigger a new (single-use) token exchange
const flow = new InterclientAccessFlow(client, {
  bootstrapUrl: 'http://localhost:8080/native/sso',
  targetWebAppClientId: '0oahoub0n9vz0nSvC1d7'
});

function LoadingView () {
  return (
    <ThemedView style={styles.centerContainer}>
      <ActivityIndicator size="large" />
    </ThemedView>
  );
}

// Also module scope, so the component's identity is stable across renders (an inline one would remount each render)
function ErrorView (error: Error, retry: () => void) {
  return (
    <ThemedView style={styles.centerContainer}>
      <ThemedText>Error: {error.message}</ThemedText>
      <Button accessibilityLabel="reloadErrorButton" title="Reload" onPress={retry} />
    </ThemedView>
  );
}

export default function WebViewScreen () {
  return (
    <ThemedView style={styles.container}>
      <SSOWebView
        flow={flow}
        renderLoading={LoadingView}
        renderSSOError={ErrorView}
        style={styles.webview}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  webview: {
    flex: 1
  },
  centerContainer: {
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
});
