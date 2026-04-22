package com.okta.webcryptobridge.integration

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.Dynamic

/**
 * Creates a mock ReadableArray from variable arguments of strings.
 * Used for simulating key usages arrays in tests.
 */
fun createReadableArray(vararg items: String): ReadableArray {
    return object : ReadableArray {
        override fun size() = items.size
        override fun getString(index: Int): String = if (index < items.size) items[index] else ""
        override fun getInt(index: Int) = 0
        override fun getDouble(index: Int) = 0.0
        override fun getBoolean(index: Int) = false
        override fun getArray(index: Int) = null
        override fun getMap(index: Int) = null
        override fun isNull(index: Int) = false
        override fun getType(index: Int) = ReadableType.String
        override fun getLong(index: Int) = 0L
        override fun getDynamic(index: Int): Dynamic {
            throw NotImplementedError("getDynamic not used in tests")
        }
        override fun toArrayList(): ArrayList<Any?> = ArrayList(items.toList())
    }
}


