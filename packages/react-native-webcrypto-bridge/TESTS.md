# WebCrypto Bridge Unit Tests

This document describes the unit test suites for the Android and iOS implementations of the WebCrypto Bridge.

## Android Tests

### Test Files

Located in `android/src/test/java/com/okta/webcryptobridge/`:

1. **CryptoUtilsTest.kt** - Tests for Base64URL encoding/decoding and byte array utilities
   - `testBase64URLEncode_producesURLSafeEncoding` - Verifies URL-safe base64 encoding
   - `testBase64URLDecode_decodesValidEncoding` - Validates decoding
   - `testBase64URLEncodeDecode_roundTrip` - Tests round-trip encode/decode
   - `testToUnsignedByteArray_*` - Tests BigInteger to byte array conversion

2. **CryptoAlgorithmRegistryTest.kt** - Tests for the algorithm handler registry
   - `testGetHandler_returnsRegisteredHandler` - Retrieves RSA handler
   - `testGetHandlerByKeyType_*` - Tests JWK key type to handler mapping
   - `testGetAlgorithmNameByKeyType_*` - Tests algorithm name resolution
   - `testRegister_customHandler` - Tests dynamic handler registration

3. **RSAHandlerTest.kt** - Tests for RSA-specific cryptographic operations
   - `testGenerateKeySpec_valid2048bitRequest` - Validates key generation spec
   - `testGenerateKeySpec_invalid*_throwsException` - Tests parameter validation
   - `testExportToJWK_producesValidRSAJWK` - Tests JWK export format
   - `testImportFromJWK_reconstructsPublicKey` - Tests JWK import
   - `testRoundTrip_exportAndImport` - Tests export/import consistency

### Running Android Tests

```bash
cd packages/react-native-webcrypto-bridge/android

# Run all tests
./gradlew test

# Run specific test class
./gradlew test --tests CryptoUtilsTest

# Run with detailed output
./gradlew test --info
```

### Test Coverage

- **CryptoUtils**: Base64URL encoding, byte array manipulation (RFC 4648, RFC 7517)
- **CryptoAlgorithmRegistry**: Handler registration, lookup by algorithm name, lookup by JWK key type
- **RSAHandler**: Key generation specs, JWK export/import, signature algorithm selection

## iOS Tests

### Test Files

Located in `ios/`:

1. **RSAKeyUtilsTests.swift** - Tests for DER encoding/decoding utilities
   - `testRSAPublicKeyComponents_initWithValidDER` - Tests DER roundtrip
   - `testRSAPublicKeyComponents_keySizeInBits` - Validates key size calculation
   - `testReadDERLength_*` - Tests DER length encoding/decoding
   - `testEncodeDERLength_*` - Tests DER length encoding

2. **RSAHandlerTests.swift** - Tests for RSA algorithm handler
   - `testGenerateKeySpec_valid2048BitRequest` - Validates key generation spec
   - `testGenerateKeySpec_invalid*_throws` - Tests parameter validation
   - `testGetSignatureAlgorithm_returnsRSAPKCS1v15SHA256` - Tests algorithm selection
   - `testExportToJWK_producesValidRSAJWK` - Tests JWK export
   - `testImportFromJWK_reconstructsComponents` - Tests JWK import
   - `testRoundTrip_exportAndImport` - Tests export/import consistency

3. **AlgorithmRegistryTests.swift** - Tests for the algorithm registry
   - `testGetHandler_returnsRegisteredHandler` - Retrieves RSA handler
   - `testGetHandlerByKeyType_*` - Tests JWK key type mapping
   - `testThreadSafety_concurrentAccess` - Tests thread-safe access with NSLock
   - `testSingleton_returnsSharedInstance` - Validates singleton pattern

### Running iOS Tests

```bash
cd packages/react-native-webcrypto-bridge/ios

# Open Xcode project/workspace
open -a Xcode .

# Or run via command line
xcodebuild test -scheme RNWebCryptoBridge

# Run specific test class
xcodebuild test -scheme RNWebCryptoBridge -only-testing:RNWebCryptoBridgeTests/RSAHandlerTests

# Run with verbose output
xcodebuild test -scheme RNWebCryptoBridge -verbose
```

### Test Coverage

- **RSAKeyUtils**: DER encoding/decoding, PKCS#1 structure validation
- **RSAHandler**: Key generation specs, JWK export/import (RFC 7517), signature algorithm selection
- **AlgorithmRegistry**: Handler registration, lookup methods, thread safety with NSLock

## Test Design

### Architecture

Both test suites follow a consistent design pattern:

- **Unit-focused**: Each test validates a single behavior
- **Handler registry pattern**: Tests verify the registry's ability to dispatch to algorithm-specific implementations
- **Algorithm-agnostic**: Tests for the registry and bridge avoid hardcoding RSA logic
- **JWK compliance**: Export/import tests validate RFC 7517 (JSON Web Key) and RFC 4648 (Base64URL) compliance

### Key Testing Insights

1. **Base64URL Encoding** (Android): Ensures URL-safe alphabet and no padding per RFC 4648 Section 5
2. **DER Encoding** (iOS): Validates PKCS#1 structure for RSA public key serialization
3. **JWK Round-Trip**: Export and reimport must preserve key components exactly
4. **Thread Safety** (iOS): AlgorithmRegistry uses NSLock to protect concurrent access
5. **Parameter Validation**: Both implementations validate algorithm parameters (e.g., 2048-bit RSA only)

## Adding Tests for New Algorithms

When implementing support for new algorithms (ECDSA, EdDSA):

### Android

1. Create a new handler class implementing `CryptoAlgorithmHandler` (e.g., `ECDSAHandler.kt`)
2. Add test class `ECDSAHandlerTest.kt` with similar structure to `RSAHandlerTest.kt`
3. Update `CryptoAlgorithmRegistry` to register the new handler
4. Add registry test cases for the new algorithm

### iOS

1. Create a new handler class implementing `CryptoAlgorithmHandler` protocol
2. Add test class `ECDSAHandlerTests.swift` with similar structure to `RSAHandlerTests.swift`
3. Update `AlgorithmRegistry` to register the new handler
4. Add registry test cases for the new algorithm

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

- **Android**: Gradle task `./gradlew test` produces reports in `android/build/reports/tests/`
- **iOS**: `xcodebuild test` integrates with Xcode's test reporting

## Test Dependencies

### Android

- **JUnit 4.13.2**: Standard testing framework
- **Mockito 5.2.0**: Mocking framework for interface testing
- **org.json**: JSON processing (already in project)

### iOS

- **XCTest**: Apple's standard testing framework (included in Xcode)
