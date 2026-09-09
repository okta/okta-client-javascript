package com.okta.webcryptobridge.algorithms

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.okta.webcryptobridge.CryptoUtils
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkConstructor
import io.mockk.mockkStatic
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import java.math.BigInteger
import java.security.KeyFactory
import java.security.interfaces.RSAPublicKey
import java.security.spec.RSAPublicKeySpec
import java.util.Base64 as JavaBase64

class RSAHandlerTest {

    private val handler = RSAHandler()

    @Before
    fun setUp() {
        // Mock Android's Base64 using Java's base64 encoder/decoder
        mockkStatic(Base64::class)
        every {
            Base64.encodeToString(any(), Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
        }.answers {
            val byteArray = args[0] as ByteArray
            JavaBase64.getUrlEncoder().withoutPadding().encodeToString(byteArray)
        }
        every {
            Base64.decode(any<String>(), Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
        }.answers {
            val encodedString = args[0] as String
            JavaBase64.getUrlDecoder().decode(encodedString)
        }

        // Mock KeyGenParameterSpec.Builder constructor and methods for RSA key generation testing
        // Builder methods must return the builder itself to support method chaining
        mockkConstructor(KeyGenParameterSpec.Builder::class)
        every { anyConstructed<KeyGenParameterSpec.Builder>().setKeySize(any()) }.answers { self as KeyGenParameterSpec.Builder }
        every { anyConstructed<KeyGenParameterSpec.Builder>().setDigests(*anyVararg()) }.answers { self as KeyGenParameterSpec.Builder }
        every { anyConstructed<KeyGenParameterSpec.Builder>().setSignaturePaddings(*anyVararg()) }.answers { self as KeyGenParameterSpec.Builder }

        // Mock the build() method to return a mock KeyGenParameterSpec
        val mockKeySpec = mockk<KeyGenParameterSpec>()
        every { anyConstructed<KeyGenParameterSpec.Builder>().build() } returns mockKeySpec
        every { mockKeySpec.getKeySize() } returns 2048
    }

    @Test
    fun testGenerateKeySpec_valid2048bitRequest() {
        val params = JSONObject().apply {
            put("modulusLength", 2048)
        }

        val keyGenSpec = handler.generateKeySpec("test_key", params, KeyProperties.PURPOSE_SIGN)

        assertNotNull(keyGenSpec)
        assertNotNull(keyGenSpec.keyGenParameterSpec)
        assertEquals(KeyProperties.KEY_ALGORITHM_RSA, keyGenSpec.keyAlgorithm)
        assertEquals(2048, keyGenSpec.keyGenParameterSpec.keySize)
    }

    @Test
    fun testGenerateKeySpec_invalid1024bit_throwsException() {
        val params = JSONObject().apply {
            put("modulusLength", 1024)
        }

        val exception = assertThrows(IllegalArgumentException::class.java) {
            handler.generateKeySpec("test_key", params, KeyProperties.PURPOSE_SIGN)
        }

        assertTrue(exception.message?.contains("2048-bit") ?: false)
    }

    @Test
    fun testGenerateKeySpec_invalid4096bit_throwsException() {
        val params = JSONObject().apply {
            put("modulusLength", 4096)
        }

        val exception = assertThrows(IllegalArgumentException::class.java) {
            handler.generateKeySpec("test_key", params, KeyProperties.PURPOSE_SIGN)
        }

        assertTrue(exception.message?.contains("2048-bit") ?: false)
    }

    @Test
    fun testGenerateKeySpec_missingModulusLength_throws() {
        val params = JSONObject()

        assertThrows(org.json.JSONException::class.java) {
            handler.generateKeySpec("test_key", params, KeyProperties.PURPOSE_SIGN)
        }
    }

    @Test
    fun testExportToJWK_producesValidRSAJWK() {
        // Create a test RSA public key with 512-bit modulus (minimum Java RSA accepts)
        val modulus = BigInteger("13407807929942597099574024998205846127479365820592393377723561204902396782632420619524063388588060570674527907588217505193955904655022796993667430081902488957615951424143683904546248171409330541224586313167537540957037327749277318899268196199264853959961841784773220626899375871856020228048436639045220963139551")
        val exponent = BigInteger("65537")
        val keySpec = RSAPublicKeySpec(modulus, exponent)
        val keyFactory = KeyFactory.getInstance("RSA")
        val publicKey = keyFactory.generatePublic(keySpec)

        val jwk = handler.exportToJWK(publicKey)

        assertEquals("RSA", jwk.getString("kty"))
        assertEquals("RS256", jwk.getString("alg"))
        assertTrue(jwk.has("n"))
        assertTrue(jwk.has("e"))
    }

    @Test
    fun testExportToJWK_encodesModulusCorrectly() {
        // Test with a known RSA 512-bit modulus and standard exponent (65537 = 0x10001)
        val modulus = BigInteger("13407807929942597099574024998205846127479365820592393377723561204902396782632420619524063388588060570674527907588217505193955904655022796993667430081902488957615951424143683904546248171409330541224586313167537540957037327749277318899268196199264853959961841784773220626899375871856020228048436639045220963139551")
        val exponent = BigInteger("65537")
        val keySpec = RSAPublicKeySpec(modulus, exponent)
        val keyFactory = KeyFactory.getInstance("RSA")
        val publicKey = keyFactory.generatePublic(keySpec)

        val jwk = handler.exportToJWK(publicKey)
        val exportedExponent = jwk.getString("e")

        // Decode and verify exponent
        val decodedExponentBytes = CryptoUtils.base64URLDecode(exportedExponent)
        val decodedExponent = BigInteger(1, decodedExponentBytes)
        assertEquals(exponent, decodedExponent)
    }

    @Test
    fun testImportFromJWK_reconstructsPublicKey() {
        // Create a test public key and export it
        val modulus = BigInteger("13407807929942597099574024998205846127479365820592393377723561204902396782632420619524063388588060570674527907588217505193955904655022796993667430081902488957615951424143683904546248171409330541224586313167537540957037327749277318899268196199264853959961841784773220626899375871856020228048436639045220963139551")
        val exponent = BigInteger("65537")
        val keySpec = RSAPublicKeySpec(modulus, exponent)
        val keyFactory = KeyFactory.getInstance("RSA")
        val originalKey = keyFactory.generatePublic(keySpec)

        // Export to JWK
        val jwk = handler.exportToJWK(originalKey)

        // Import back
        val reimportedKey = handler.importFromJWK(jwk) as RSAPublicKey

        // Verify they match
        assertEquals(modulus, reimportedKey.modulus)
        assertEquals(exponent, reimportedKey.publicExponent)
    }

    @Test
    fun testImportFromJWK_missingModulus_throws() {
        val jwk = JSONObject().apply {
            put("e", CryptoUtils.base64URLEncode(BigInteger("65537").toByteArray()))
        }

        assertThrows(org.json.JSONException::class.java) {
            handler.importFromJWK(jwk)
        }
    }

    @Test
    fun testImportFromJWK_missingExponent_throws() {
        val jwk = JSONObject().apply {
            put("n", CryptoUtils.base64URLEncode(BigInteger("12345").toByteArray()))
        }

        assertThrows(org.json.JSONException::class.java) {
            handler.importFromJWK(jwk)
        }
    }

    @Test
    fun testImportFromJWK_invalidBase64_throws() {
        val jwk = JSONObject().apply {
            put("n", "not valid base64!@#$")
            put("e", "also not valid!@#$")
        }

        assertThrows(Exception::class.java) {
            handler.importFromJWK(jwk)
        }
    }

    @Test
    fun testGetSignatureAlgorithm_returnsSHA256withRSA() {
        val algorithm = handler.getSignatureAlgorithm()
        assertEquals("SHA256withRSA", algorithm)
    }

    @Test
    fun testRoundTrip_exportAndImport() {
        // Create multiple RSA keys and verify round-trip export/import
        val testCases = listOf(
            // 512-bit RSA modulus with standard exponent
            Pair(
                BigInteger("13407807929942597099574024998205846127479365820592393377723561204902396782632420619524063388588060570674527907588217505193955904655022796993667430081902488957615951424143683904546248171409330541224586313167537540957037327749277318899268196199264853959961841784773220626899375871856020228048436639045220963139551"),
                BigInteger("65537")
            ),
            // Another 512-bit RSA modulus
            Pair(
                BigInteger("12621776367165119722584210296089220304600850433864372891562882765235950760458122857151589318095220702868841742280047671521002221374696929971188236805638433923476883267126889641871743624265652061346325819589706324949295396904658826325555921968926283374687352405821125423521124239456707629408837282697301433897183"),
                BigInteger("65537")
            )
        )

        for ((modulus, exponent) in testCases) {
            val keySpec = RSAPublicKeySpec(modulus, exponent)
            val keyFactory = KeyFactory.getInstance("RSA")
            val originalKey = keyFactory.generatePublic(keySpec)

            // Export
            val jwk = handler.exportToJWK(originalKey)

            // Import
            val reimportedKey = handler.importFromJWK(jwk) as RSAPublicKey

            // Verify
            assertEquals("Failed for modulus=$modulus, exponent=$exponent",
                       modulus, reimportedKey.modulus)
            assertEquals("Failed for modulus=$modulus, exponent=$exponent",
                       exponent, reimportedKey.publicExponent)
        }
    }
}
