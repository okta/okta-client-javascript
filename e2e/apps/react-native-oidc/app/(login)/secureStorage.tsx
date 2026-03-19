import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SecureStorage } from "@okta/react-native";

export default function SecureStorageScreen() {
  const [out, setOut] = useState<string>("Running self-test...");

  useEffect(() => {
    const test = async () => {
      try {
        let log = "";

        console.log("SecureStorage", SecureStorage);

        const key1 = "test_key";
        const key2 = "test_key2";
        const key3 = "test_key3";

        await SecureStorage.setItem(key1, "super-secret-value");
        await SecureStorage.setItem(key2, "super-secret-value2");
        await SecureStorage.setItem(key3, "super-secret-value3");

        const value = await SecureStorage.getItem("test_key");
        const value2 = await SecureStorage.getItem("test_key2");
        const value3 = await SecureStorage.getItem("test_key3");
        log += `SecureStorage.getItem \n`;
        log += `for key: ${key1} the value: ${value}\n`;
        log += `for key: ${key2} the value: ${value2}\n`;
        log += `for key: ${key3} the value: ${value3}\n`;

        if (value !== "super-secret-value") {
          throw new Error(`Unexpected value from secure storage: ${value}`);
        }

        if (value2 !== "super-secret-value2") {
          throw new Error(`Unexpected value from secure storage: ${value2}`);
        }

        if (value3 !== "super-secret-value3") {
          throw new Error(`Unexpected value from secure storage: ${value3}`);
        }

        await SecureStorage.removeItem(key1);
        const afterRemoveValue1 = await SecureStorage.getItem(key1);
        const afterRemoveValue2 = await SecureStorage.getItem(key2);
        const afterRemoveValue3 = await SecureStorage.getItem(key3);

        log += `\n After remove for key: ${key1}\n`;
        log += `for key: ${key1} the value: ${afterRemoveValue1}\n`;
        log += `for key: ${key2} the value: ${afterRemoveValue2}\n`;
        log += `for key: ${key3} the value: ${afterRemoveValue3}\n`;

        if (afterRemoveValue1 !== null) {
          throw new Error(
            `Expected null for deleted key, got: ${afterRemoveValue1}`,
          );
        }

        await SecureStorage.clear();
        const afterClearValue1 = await SecureStorage.getItem(key1);
        const afterClearValue2 = await SecureStorage.getItem(key2);
        const afterClearValue3 = await SecureStorage.getItem(key3);

        log += `\n After clear \n`;
        log += `for key: ${key1} the value: ${afterClearValue1}\n`;
        log += `for key: ${key2} the value: ${afterClearValue2}\n`;
        log += `for key: ${key3} the value: ${afterClearValue3}\n`;

        setOut(log);
      } catch (e) {
        setOut(`SecureStorage self-test failed: ${(e as Error).message}`);
      }
    };

    test();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>{out}</Text>
    </View>
  );
}
