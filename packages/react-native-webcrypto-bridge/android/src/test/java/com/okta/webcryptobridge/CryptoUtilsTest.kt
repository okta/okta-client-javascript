package com.okta.webcryptobridge

import android.util.Base64
import io.mockk.every
import io.mockk.mockkStatic
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import java.math.BigInteger
import java.util.Base64 as JavaBase64

class CryptoUtilsTest {

    @Before
    fun setUp() {
        // Mock Android's Base64 using Java's base64 encoder/decoder
        mockkStatic(Base64::class)
        every {
            Base64.encodeToString(any(), Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
        }.answers { bytes ->
            val byteArray = args[0] as ByteArray
            JavaBase64.getUrlEncoder().withoutPadding().encodeToString(byteArray)
        }
        every {
            Base64.decode(any<String>(), Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
        }.answers {
            val encodedString = args[0] as String
            JavaBase64.getUrlDecoder().decode(encodedString)
        }
    }

    @Test
    fun testToUnsignedByteArray_removesLeadingZeroByte() {
        // BigInteger with high bit set gets a leading zero in toByteArray() for sign preservation
        // 32768 (0x8000) requires a leading 0x00 byte in two's complement: [0x00, 0x80, 0x00]
        // After stripping the leading zero: [0x80, 0x00]
        val value = BigInteger("32768")
        val result = CryptoUtils.toUnsignedByteArray(value)

        // Should strip leading zero byte added by BigInteger.toByteArray()
        assertEquals(2, result.size)
        assertEquals(0x80.toByte(), result[0])
        assertEquals(0x00.toByte(), result[1])
    }

    @Test
    fun testToUnsignedByteArray_noLeadingZero() {
        // BigInteger without leading zero
        val value = BigInteger("127")
        val result = CryptoUtils.toUnsignedByteArray(value)

        assertEquals(1, result.size)
        assertEquals(127.toByte(), result[0])
    }

    @Test
    fun testToUnsignedByteArray_largeNumber() {
        // Large RSA-like modulus
        val value = BigInteger("65537") // Common RSA exponent
        val result = CryptoUtils.toUnsignedByteArray(value)

        // Should be 3 bytes: [1, 0, 1]
        assertEquals(3, result.size)
        assertEquals(1.toByte(), result[0])
        assertEquals(0.toByte(), result[1])
        assertEquals(1.toByte(), result[2])
    }

    @Test
    fun testBase64URLEncode_producesURLSafeEncoding() {
        val data = byteArrayOf(0xFB.toByte(), 0xFF.toByte()) // Test data with URL-unsafe chars
        val encoded = CryptoUtils.base64URLEncode(data)

        // Should not contain standard base64 padding or unsafe chars
        assertFalse(encoded.contains("+"))
        assertFalse(encoded.contains("/"))
        assertFalse(encoded.contains("="))

        // Should contain URL-safe chars
        assertTrue(encoded.matches(Regex("[A-Za-z0-9_-]*")))
    }

    @Test
    fun testBase64URLEncode_noPadding() {
        val data = "Hello".toByteArray()
        val encoded = CryptoUtils.base64URLEncode(data)

        // RFC 4648 Section 5 specifies no padding for base64url
        assertFalse(encoded.endsWith("="))
    }

    @Test
    fun testBase64URLDecode_decodesValidEncoding() {
        val original = "Hello, World!".toByteArray()
        val encoded = CryptoUtils.base64URLEncode(original)
        val decoded = CryptoUtils.base64URLDecode(encoded)

        assertArrayEquals(original, decoded)
    }

    @Test
    fun testBase64URLEncodeDecode_roundTrip() {
        val testCases = listOf(
            byteArrayOf(),
            byteArrayOf(0),
            byteArrayOf(255.toByte()),
            "RSA public key exponent".toByteArray(),
            ByteArray(256) { it.toByte() } // Full byte range
        )

        for (original in testCases) {
            val encoded = CryptoUtils.base64URLEncode(original)
            val decoded = CryptoUtils.base64URLDecode(encoded)
            assertArrayEquals("Failed for input: ${original.contentToString()}", original, decoded)
        }
    }
}
