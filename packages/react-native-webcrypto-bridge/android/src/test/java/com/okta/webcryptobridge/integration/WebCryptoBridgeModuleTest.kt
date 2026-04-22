package com.okta.webcryptobridge.integration

import android.app.Application
import androidx.test.core.app.ApplicationProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.okta.webcryptobridge.WebCryptoBridgeModule
import io.mockk.mockk
import io.mockk.every
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import io.mockk.just
import io.mockk.Runs
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.Signature
import java.security.PrivateKey
import java.security.PublicKey
import javax.crypto.Cipher
import android.security.keystore.KeyGenParameterSpec
import org.junit.After
import org.junit.Before
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Base class for WebCryptoBridgeModule integration tests.
 * Provides Robolectric setup and utilities for testing module methods with captured promises.
 */
@org.junit.runner.RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
abstract class WebCryptoBridgeModuleTest {

    protected lateinit var module: WebCryptoBridgeModule
    protected lateinit var context: ReactApplicationContext
    protected val promises = mutableListOf<MockedPromise>()

    @Before
    fun setUp() {
        val application = ApplicationProvider.getApplicationContext<Application>()
        context = mockk(relaxed = true)
        every { context.currentActivity } returns null

        // Mock KeyPairGenerator.getInstance to avoid Robolectric Keystore limitations
        mockkStatic(KeyPairGenerator::class)
        every { KeyPairGenerator.getInstance(any(), "AndroidKeyStore") } answers {
            createMockKeyPairGenerator()
        }

        // Mock Signature.getInstance to avoid Robolectric Keystore limitations
        mockkStatic(Signature::class)
        every { Signature.getInstance(any()) } answers {
            createMockSignature()
        }

        // Mock Cipher.getInstance to avoid Robolectric Keystore limitations
        mockkStatic(Cipher::class)
        every { Cipher.getInstance(any()) } answers {
            createMockCipher()
        }

        module = WebCryptoBridgeModule(context)
    }

    @After
    fun tearDown() {
        promises.clear()
        unmockkStatic(KeyPairGenerator::class)
        unmockkStatic(Signature::class)
        unmockkStatic(Cipher::class)
    }

    private fun createMockKeyPairGenerator(): KeyPairGenerator {
        return mockk<KeyPairGenerator> {
            every { initialize(any<KeyGenParameterSpec>()) } just Runs
            every { generateKeyPair() } answers {
                // Create a mock KeyPair with mock keys
                mockk<KeyPair> {
                    every { public } returns mockk(relaxed = true)
                    every { private } returns mockk(relaxed = true)
                }
            }
        }
    }

    private fun createMockSignature(): Signature {
        return mockk {
            val updateData = mutableListOf<ByteArray>()

            every { initSign(any<PrivateKey>()) } just Runs
            every { initVerify(any<PublicKey>()) } just Runs
            every { update(any<ByteArray>()) } answers {
                updateData.add(it.invocation.args[0] as ByteArray)
            }
            every { update(any<Byte>()) } just Runs
            every { sign() } answers {
                // Generate a consistent signature from the data
                updateData.flatMap { data ->
                    data.toList().mapIndexed { idx, byte ->
                        (byte.toInt() + idx + 1).toByte()
                    }
                }.toByteArray().takeIf { it.isNotEmpty() } ?: byteArrayOf(0x42)
            }
            every { verify(any<ByteArray>()) } answers {
                val providedSig = it.invocation.args[0] as ByteArray
                val expectedSig = updateData.flatMap { data ->
                    data.toList().mapIndexed { idx, byte ->
                        (byte.toInt() + idx + 1).toByte()
                    }
                }.toByteArray().takeIf { it.isNotEmpty() } ?: byteArrayOf(0x42)
                providedSig.contentEquals(expectedSig)
            }
        }
    }

    private fun createMockCipher(): Cipher {
        return mockk(relaxed = true) {
            every { init(any<Int>(), any<PrivateKey>()) } answers { }
            every { init(any<Int>(), any<PublicKey>()) } answers { }
            every { doFinal(any<ByteArray>()) } answers {
                // Return transformed data
                val input = it.invocation.args[0] as ByteArray
                input.map { b -> (b.toInt() xor 0xAA).toByte() }.toByteArray()
            }
            every { getBlockSize() } returns 128
            every { getOutputSize(any()) } answers { ((it.invocation.args[0] as Int) * 2) }
        }
    }

    protected fun createMockPromise(): MockedPromise = MockedPromise().also {
        promises.add(it)
    }
}

/**
 * Spy-based Promise wrapper for testing that tracks resolve/reject calls.
 * Uses a relaxed mock to auto-implement all Promise methods, then wraps it
 * with overrides to track the calls we care about.
 */
class MockedPromise {
    var resolvedValue: Any? = null
    var rejectedCode: String? = null
    var rejectedMessage: String? = null
    var isResolved = false
    var isRejected = false

    fun getMockPromise(): Promise {
        val self = this
        val relaxedMock = mockk<Promise>(relaxed = true)

        // Wrapper that tracks calls while delegating to the relaxed mock
        return object : Promise by relaxedMock {
            override fun resolve(value: Any?) {
                self.resolvedValue = value
                self.isResolved = true
                relaxedMock.resolve(value)
            }

            override fun reject(throwable: Throwable) {
                self.rejectedCode = "error"
                self.rejectedMessage = throwable.message
                self.isRejected = true
                relaxedMock.reject(throwable)
            }

            override fun reject(code: String, message: String?) {
                self.rejectedCode = code
                self.rejectedMessage = message
                self.isRejected = true
                relaxedMock.reject(code, message)
            }

            override fun reject(code: String, throwable: Throwable?) {
                self.rejectedCode = code
                self.rejectedMessage = throwable?.message
                self.isRejected = true
                relaxedMock.reject(code, throwable)
            }

            override fun reject(code: String, message: String?, throwable: Throwable?) {
                self.rejectedCode = code
                self.rejectedMessage = message ?: throwable?.message
                self.isRejected = true
                relaxedMock.reject(code, message, throwable)
            }
        }
    }
}



