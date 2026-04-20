package com.okta.webcryptobridge

import android.util.Base64
import java.math.BigInteger

/**
 * Common cryptographic utilities for JWK encoding/decoding and byte manipulation.
 * Consolidates Base64URL and byte array operations used across multiple handlers.
 */
object CryptoUtils {
    /**
     * Converts a BigInteger to an unsigned byte array by stripping leading zero bytes.
     * Per RFC 7517 (JSON Web Key), JWK numeric fields should not have unnecessary padding.
     *
     * @param value the BigInteger to convert (e.g., RSA modulus or exponent)
     * @return unsigned byte array without leading padding zeros
     */
    fun toUnsignedByteArray(value: BigInteger): ByteArray {
        val bytes = value.toByteArray()
        return if (bytes[0].toInt() == 0 && bytes.size > 1) {
            bytes.copyOfRange(1, bytes.size)
        } else {
            bytes
        }
    }

    /**
     * Encodes data as Base64URL per RFC 4648 Section 5.
     * Base64URL uses URL-safe alphabet and omits padding characters.
     *
     * @param data the bytes to encode
     * @return Base64URL-encoded string (no padding)
     */
    fun base64URLEncode(data: ByteArray): String =
        Base64.encodeToString(data, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)

    /**
     * Decodes a Base64URL string per RFC 4648 Section 5.
     * Handles URL-safe alphabet and no-padding variants.
     *
     * @param input the Base64URL-encoded string
     * @return decoded bytes
     */
    fun base64URLDecode(input: String): ByteArray =
        Base64.decode(input, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
}
