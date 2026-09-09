import { ActivityIndicator, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';


// Simply renders a login indicator while the Authorization Code flow exchange completes
export default function CallbackScreen() {
  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="large" />
      <ThemedText>Processing login...</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
