# WebCrypto Bridge Unit Tests

This document describes the unit test suites for the Android and iOS implementations of the WebCrypto Bridge.

## Android Tests

### Unit Tests

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

### Integration Tests

Located in `android/src/test/java/com/okta/webcryptobridge/integration/`:

Integration tests use **Robolectric** to simulate Android runtime on the JVM, enabling testing of WebCryptoBridgeModule with real Android Keystore operations without needing a device or emulator.

**Note on Robolectric Limitations**: Robolectric simulates the Android framework but cannot perform actual cryptographic operations (RSA math, signature generation/verification, key material handling). Tests requiring real crypto operations have been removed from the suite. The remaining tests focus on error handling, API contracts, and parameter validation.

1. **KeyGenerationTest.kt** - Key generation and Keystore storage
   - `testGenerateKey_validRSA2048_createsKeystoreEntry` - Generate RSA 2048 key
   - `testGenerateKey_unsupportedAlgorithm_rejects` - Reject unsupported algorithms
   - `testGenerateKey_invalidModulusLength_rejects` - Validate modulus length
   - `testGenerateKey_emptyKeyUsages_rejects` - Require at least one usage
   - `testGenerateKey_invalidKeyUsage_rejects` - Only allow sign/verify
   - `testGenerateKey_multipleKeys_createsDistinctIds` - Each key has unique ID

2. **JWKTest.kt** - JWK export/import validation
   - `testExportKey_unknownKeyId_rejects` - Handle missing keys
   - `testExportKey_unsupportedFormat_rejects` - Only support JWK format
   - `testImportKey_validJWK_succeeds` - Import external JWK
   - `testImportKey_missingModulus_rejects` - Validate JWK structure

3. **SignatureTest.kt** - Sign/verify error handling
   - `testSign_unknownKeyId_rejects` - Handle missing keys

### Running Android Tests

```bash
cd packages/react-native-webcrypto-bridge/android

# Run all tests (unit + integration)
./gradlew test

# Run specific test class
./gradlew test --tests CryptoUtilsTest
./gradlew test --tests KeyGenerationTest

# Run only integration tests
./gradlew test --tests "*integration*"

# Run with detailed output
./gradlew test --info
```

### Test Coverage

**Unit Tests:**
- Base64URL encoding/decoding per RFC 4648
- BigInteger to unsigned byte array conversion
- Handler registry dispatch and lookup
- RSA key generation specs validation
- JWK export/import for RSA keys
- Signature algorithm selection

**Integration Tests:**
- Full key generation → storage → retrieval flow
- Module method execution with React Native Promise callbacks
- Android Keystore integration via Robolectric shadows
- Error handling (invalid algorithms, missing keys, unsupported operations)
- Parameter validation (algorithm selection, key usage types, JWK structure)

### Test Architecture

**Unit Tests** (`testDebugUnitTest`):
- Mock Android framework classes (Base64, KeyGenParameterSpec)
- Test algorithm logic in isolation
- Fast execution, reusable test vectors

**Integration Tests** (`testDebugUnitTest` with Robolectric):
- Simulate Android runtime via Robolectric shadows
- Test WebCryptoBridgeModule end-to-end
- Real Android Keystore interactions
- Promise callback capture and assertion

### Why Robolectric for Integration Tests?

- ✅ No device/emulator required
- ✅ Runs on JVM (fast iteration)
- ✅ Simulates Android Keystore via shadows
- ✅ Suitable for CI/CD pipelines
- ✅ Same test execution model as unit tests
- ⚠️ Cannot perform actual cryptographic operations (RSA math, signature generation/verification)
- ⚠️ Tests requiring real crypto operations must be tested on physical devices or emulators

### Test Dependencies

- **JUnit 4.13.2**: Standard testing framework
- **MockK 1.13.5**: Kotlin mocking framework
- **Truth 1.1.2**: Google's fluent assertion library
- **Robolectric 4.12.1**: Android runtime simulator
- **androidx.test:core 1.5.0**: AndroidX testing utilities

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
   - `testGetHandler_returnsNilForUnregisteredAlgorithm` - Returns nil for unknown algorithm
   - `testGetHandlerByKeyType_*` - Tests JWK key type mapping (4 tests)
   - `testGetAlgorithmName_*` - Tests algorithm name mapping by key type (4 tests: RSA, EC, OKP, unknown)
   - `testRegister_customHandler_returnsRegisteredHandler` - Register new algorithms dynamically
   - `testRegister_overwrites_existingHandler` - Overwrite existing handler
   - `testThreadSafety_concurrentAccess` - Tests thread-safe access with NSLock
   - `testSingleton_returnsSharedInstance` - Validates singleton pattern
   - `testConcurrentRegistration_succeeds` - 50 concurrent registrations
   - `testMixedConcurrentOperations_succeeds` - 100 concurrent mixed operations

### Integration Tests

Located in `ios/Tests/RNWebCryptoBridgeTests/Integration/`:

Integration tests verify end-to-end crypto workflows using mock infrastructure without React Native dependencies. Tests coordinate between AlgorithmRegistry and algorithm handlers (RSAHandler) to validate key generation, JWK export/import, and signature operations.

1. **KeyGenerationIntegrationTests.swift** - Key generation workflow validation (14 tests)
   - `testGenerateKeySpec_validRSA2048_succeeds` - Generate valid RSA 2048 key spec
   - `testGenerateKeySpec_unsupportedAlgorithm_rejects` - Reject unsupported algorithms
   - `testGenerateKeySpec_invalidModulusLength_throws` - Reject 1024-bit keys
   - `testGenerateKeySpec_missing4096Bit_throws` - Reject 4096-bit keys
   - `testGenerateKeySpec_emptyParams_usesDefault` - Default to 2048-bit
   - `testKeyUsages_valid_sign_verify` - Store and retrieve key usages
   - `testKeyUsages_invalid_extractable` - Validate usage constraints
   - `testMultipleKeys_createDistinctIds` - Generate unique key IDs
   - `testHandlerRegistry_dispatchByAlgorithm` - Route to correct handler by algorithm name
   - `testHandlerRegistry_dispatchByKeyType` - Route to correct handler by key type
   - `testAlgorithmMapping_RSA_to_RSASSA` - RSA key type maps to RSASSA-PKCS1-v1_5
   - `testAlgorithmMapping_EC_to_ECDSA` - EC key type maps to ECDSA
   - `testAlgorithmMapping_OKP_to_EdDSA` - OKP key type maps to EdDSA
   - `testAlgorithmMapping_unknown_returnsNil` - Unknown key type returns nil

2. **JWKIntegrationTests.swift** - JWK export/import validation (9 tests)
   - `testExportKey_publicKey_producesValidJWK` - Export generates RFC 7517 structure
   - `testExportKey_unknownKeyId_fails` - Handle missing keys gracefully
   - `testImportKey_validJWK_succeeds` - Import external JWK data
   - `testImportKey_missingModulus_fails` - Reject incomplete JWK
   - `testImportKey_missingExponent_fails` - Reject incomplete JWK
   - `testRoundTrip_exportThenImport` - Export/import round-trip consistency
   - `testJWK_multipleRoundTrips` - Stability across multiple cycles
   - `testJWK_structure_validation` - JWK contains kty, alg, n, e fields
   - `testKeyStorage_storeAndRetrieveJWK` - Mock key store operations

3. **SignatureIntegrationTests.swift** - Signature operation validation (12 tests)
   - `testSignatureAlgorithm_RSA_returnsPKCS1v15SHA256` - Correct algorithm selection
   - `testSign_noKeyId_fails` - Handle missing keys
   - `testSign_validKey_requiresHandler` - Key validation and handler dispatch
   - `testVerify_requiresPublicKey` - Public key usage validation
   - `testKeyUsages_sign_and_verify` - Private key has both usages
   - `testKeyUsages_verify_only` - Public key verify-only
   - `testErrorHandling_invalidAlgorithm` - Reject unknown algorithms
   - `testErrorHandling_keyTypeMismatch` - Prevent signing with public key
   - `testSignatureWorkflow_keyDispatch` - Full signing workflow dispatch
   - `testVerificationWorkflow_keyDispatch` - Full verification workflow dispatch
   - `testMultipleKeys_differentOperations` - Distinguish key types
   - `testSignatureAlgorithmSelection_consistency` - Consistent algorithm selection via different lookup paths

### Running iOS Tests

iOS tests use Swift Package Manager (SPM) for building and testing:

```bash
cd packages/react-native-webcrypto-bridge/ios

# Run all tests
swift test

# Run with verbose output
swift test --verbose

# Run specific test class
swift test RSAHandlerTests

# Generate Xcode project locally (optional, for development)
swift package generate-xcodeproj
open RNWebCryptoBridge.xcodeproj
```

**CI/CD Integration:**
- Tests can be run directly with `swift test` in any CI environment
- No Xcode project required (text-based `Package.swift` configuration)
- Output compatible with standard test reporting tools

### Test Coverage

**Unit Tests:**
- **RSAKeyUtils**: DER encoding/decoding (7 tests), PKCS#1 structure validation
- **RSAHandler**: Key generation specs (12 tests), JWK export/import (RFC 7517), signature algorithm selection, round-trip consistency
- **AlgorithmRegistry**: Handler registration (16 tests), algorithm name mapping, handler lookup, singleton pattern, thread safety, concurrent access stress testing

**Integration Tests (35 tests):**
- **KeyGeneration**: Registry dispatch by algorithm and key type (14 tests), handler routing, algorithm mapping validation
- **JWK**: Export/import round-trip consistency (9 tests), RFC 7517 structure validation, mock key store operations
- **Signature**: Key generation → dispatch → algorithm selection consistency (12 tests), error handling for key type mismatches

## Test Design

### Architecture

Both test suites follow a consistent design pattern:

**Unit Tests:**
- **Unit-focused**: Each test validates a single behavior
- **Handler registry pattern**: Tests verify the registry's ability to dispatch to algorithm-specific implementations
- **Algorithm-agnostic**: Tests for the registry and bridge avoid hardcoding RSA logic
- **JWK compliance**: Export/import tests validate RFC 7517 (JSON Web Key) and RFC 4648 (Base64URL) compliance

**Integration Tests (iOS):**
- **Workflow validation**: Test end-to-end operations (generate → export → import → verify) without React dependencies
- **Mock infrastructure**: AsyncTestResult container, MockKeyStore, and helper methods enable component testing in isolation
- **Registry dispatch**: Verify correct handler routing by algorithm name and key type
- **Component coordination**: Validate AlgorithmRegistry and RSAHandler working together

### Key Testing Insights

1. **Base64URL Encoding** (Android): Ensures URL-safe alphabet and no padding per RFC 4648 Section 5
2. **DER Encoding** (iOS): Validates PKCS#1 structure for RSA public key serialization
3. **JWK Round-Trip**: Export and reimport must preserve key components exactly
4. **Thread Safety** (iOS): AlgorithmRegistry uses NSLock to protect concurrent access
5. **Parameter Validation**: Both implementations validate algorithm parameters (e.g., 2048-bit RSA only)
6. **Robolectric Integration** (Android): Android Keystore operations can be tested on JVM via shadows
7. **Integration Test Infrastructure** (iOS): MockKeyStore and AsyncTestResult enable testing component coordination without React Native dependencies
8. **Handler Dispatch Paths** (iOS integration): Tests validate both algorithm name and key type lookup paths produce consistent results

## Adding Tests for New Algorithms

When implementing support for new algorithms (ECDSA, EdDSA):

### Android

1. Create a new handler class implementing `CryptoAlgorithmHandler` (e.g., `ECDSAHandler.kt`)
2. Add test class `ECDSAHandlerTest.kt` with structure similar to `RSAHandlerTest.kt`
3. Add integration test suite `ECDSAIntegrationTest.kt` for module-level testing
4. Update `CryptoAlgorithmRegistry` to register the new handler
5. Add registry test cases for the new algorithm

### iOS

1. Create a new handler class implementing `CryptoAlgorithmHandler` protocol
2. Add test class `ECDSAHandlerTests.swift` with similar structure to `RSAHandlerTests.swift`
3. Update `AlgorithmRegistry` to register the new handler
4. Add registry test cases for the new algorithm

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

- **Android**: Gradle task `./gradlew test` runs all unit + integration tests; produces reports in `android/build/reports/tests/`
- **iOS**: `xcodebuild test` integrates with Xcode's test reporting
