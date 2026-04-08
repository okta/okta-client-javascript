import { moduleWebCryptoPollyfill } from "@okta/react-native";
console.log("TESTSSSSSS");

moduleWebCryptoPollyfill();

console.log("globalThis.crypto", globalThis.crypto);
// global.crypto = global.crypto ?? globalThis.crypto;
import "expo-router/entry";
