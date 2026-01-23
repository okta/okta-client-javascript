import { NativeModules, Platform } from "react-native";

const { SecureStorageNativeBridge } = NativeModules;
console.log(
  "NativeModules.SecureStorageNativeBridge",
  SecureStorageNativeBridge,
);

export const SecureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!SecureStorageNativeBridge) {
      throw new Error("SecureStorageNativeBridge not linked");
    }
    const value = await SecureStorageNativeBridge.getItem(key);
    return value ?? null;
  },

  // getItemSync(key: string): string | null {
  //   if (!SecureStorageNativeBridge?.getItemSync) {
  //     return null;
  //   }

  //   return SecureStorageNativeBridge.getItemSync(key);
  // },

  async setItem(key: string, value: string): Promise<void> {
    if (!SecureStorageNativeBridge) {
      throw new Error("SecureStorageNativeBridge not linked");
    }
    await SecureStorageNativeBridge.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (!SecureStorageNativeBridge) {
      throw new Error("SecureStorageNativeBridge not linked");
    }

    await SecureStorageNativeBridge.removeItem(key);
  },

  async clear(): Promise<void> {
    if (!SecureStorageNativeBridge) {
      throw new Error("SecureStorageNativeBridge not linked");
    }
    await SecureStorageNativeBridge.clear();
  },
};
