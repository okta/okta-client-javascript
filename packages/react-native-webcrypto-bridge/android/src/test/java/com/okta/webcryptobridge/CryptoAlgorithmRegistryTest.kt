package com.okta.webcryptobridge

import io.mockk.mockk
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class CryptoAlgorithmRegistryTest {

    private lateinit var registry: CryptoAlgorithmRegistry
    private lateinit var mockHandler: CryptoAlgorithmHandler

    @Before
    fun setUp() {
        // Since CryptoAlgorithmRegistry is a singleton with init block,
        // we test through its public interface
        registry = CryptoAlgorithmRegistry
        mockHandler = mockk()
    }

    @Test
    fun testGetHandler_returnsRegisteredHandler() {
        val handler = registry.getHandler("RSASSA-PKCS1-v1_5")
        assertNotNull("RSA handler should be registered", handler)
    }

    @Test
    fun testGetHandler_returnsNullForUnregisteredAlgorithm() {
        val handler = registry.getHandler("NONEXISTENT")
        assertNull("Unregistered algorithm should return null", handler)
    }

    @Test
    fun testGetHandlerByKeyType_RSA_returnsHandler() {
        val handler = registry.getHandlerByKeyType("RSA")
        assertNotNull("RSA key type should return handler", handler)
    }

    @Test
    fun testGetHandlerByKeyType_EC_returnsNull() {
        // EC handler not yet registered
        val handler = registry.getHandlerByKeyType("EC")
        assertNull("EC key type should return null (not yet implemented)", handler)
    }

    @Test
    fun testGetHandlerByKeyType_OKP_returnsNull() {
        // EdDSA handler not yet registered
        val handler = registry.getHandlerByKeyType("OKP")
        assertNull("OKP key type should return null (not yet implemented)", handler)
    }

    @Test
    fun testGetHandlerByKeyType_unknownType_returnsNull() {
        val handler = registry.getHandlerByKeyType("UNKNOWN")
        assertNull("Unknown key type should return null", handler)
    }

    @Test
    fun testGetAlgorithmNameByKeyType_RSA() {
        val algorithmName = registry.getAlgorithmNameByKeyType("RSA")
        assertEquals("RSA key type should map to RSASSA-PKCS1-v1_5",
                   "RSASSA-PKCS1-v1_5", algorithmName)
    }

    @Test
    fun testGetAlgorithmNameByKeyType_EC() {
        val algorithmName = registry.getAlgorithmNameByKeyType("EC")
        assertEquals("EC key type should map to ECDSA", "ECDSA", algorithmName)
    }

    @Test
    fun testGetAlgorithmNameByKeyType_OKP() {
        val algorithmName = registry.getAlgorithmNameByKeyType("OKP")
        assertEquals("OKP key type should map to EdDSA", "EdDSA", algorithmName)
    }

    @Test
    fun testGetAlgorithmNameByKeyType_unknown() {
        val algorithmName = registry.getAlgorithmNameByKeyType("UNKNOWN")
        assertNull("Unknown key type should return null", algorithmName)
    }

    @Test
    fun testRegister_customHandler() {
        val customHandler = mockk<CryptoAlgorithmHandler>()
        registry.register("CUSTOM-ALGORITHM", customHandler)

        val retrieved = registry.getHandler("CUSTOM-ALGORITHM")
        assertSame("Registered handler should be retrieable", customHandler, retrieved)
    }

    @Test
    fun testRegister_overwrites_existingHandler() {
        val newHandler = mockk<CryptoAlgorithmHandler>()
        registry.register("RSASSA-PKCS1-v1_5", newHandler)

        val retrieved = registry.getHandler("RSASSA-PKCS1-v1_5")
        assertSame("New handler should overwrite old one", newHandler, retrieved)
    }
}

