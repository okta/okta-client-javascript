import XCTest
import Security
@testable import RNTokenStorageBridge

class KeychainHelperTests: XCTestCase {

    let testService = "com.okta.test.service"
    let testKey = "test-key"
    let testValue = "test-value"

    override func setUp() {
        super.setUp()
        cleanupTestKeychain()
    }

    override func tearDown() {
        super.tearDown()
        cleanupTestKeychain()
    }

    // MARK: - Save Tests

    func testSave_shouldStoreValueInKeychain() {
        let accessibility = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

        XCTAssertNoThrow({
            try KeychainHelper.save(
                service: self.testService,
                key: self.testKey,
                value: self.testValue,
                accessibility: accessibility
            )
        })
    }

    func testSave_withDifferentAccessibility_shouldSucceed() {
        let restrictions = [
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]

        for accessibility in restrictions {
            let uniqueKey = "\(testKey)-\(UUID().uuidString)"
            XCTAssertNoThrow({
                try KeychainHelper.save(
                    service: self.testService,
                    key: uniqueKey,
                    value: self.testValue,
                    accessibility: accessibility
                )
            })
        }
    }

    // MARK: - Load Tests

    func testLoad_savedValue_shouldReturnValue() {
        let accessibility = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

        try? KeychainHelper.save(
            service: testService,
            key: testKey,
            value: testValue,
            accessibility: accessibility
        )

        let result = try? KeychainHelper.load(service: testService, key: testKey)

        XCTAssertEqual(result, testValue)
    }

    func testLoad_nonExistent_shouldReturnNil() {
        let result = try? KeychainHelper.load(service: testService, key: "non-existent")

        XCTAssertNil(result)
    }

    func testLoad_afterSaveAndDelete_shouldReturnNil() {
        let accessibility = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

        try? KeychainHelper.save(
            service: testService,
            key: testKey,
            value: testValue,
            accessibility: accessibility
        )

        try? KeychainHelper.delete(service: testService, key: testKey)

        let result = try? KeychainHelper.load(service: testService, key: testKey)

        XCTAssertNil(result)
    }

    // MARK: - Delete Tests

    func testDelete_savedValue_shouldRemoveValue() {
        let accessibility = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let uniqueKey = "isolated-delete-test-\(UUID().uuidString)"
        let testData = "isolated-delete-data"

        // Step 1: Save
        do {
            try KeychainHelper.save(
                service: self.testService,
                key: uniqueKey,
                value: testData,
                accessibility: accessibility
            )
        } catch {
            XCTFail("Save should not throw: \(error)")
            return
        }

        // Step 2: Verify save worked
        do {
            let savedValue = try KeychainHelper.load(service: self.testService, key: uniqueKey)
            XCTAssertEqual(savedValue, testData)
        } catch {
            XCTFail("Load after save should not throw: \(error)")
            return
        }

        // Step 3: Delete
        do {
            try KeychainHelper.delete(service: self.testService, key: uniqueKey)
        } catch {
            XCTFail("Delete should not throw: \(error)")
            return
        }

        // Step 4: Verify delete worked
        do {
            let deletedValue = try KeychainHelper.load(service: self.testService, key: uniqueKey)
            XCTAssertNil(deletedValue)
        } catch {
            XCTFail("Load after delete should not throw: \(error)")
            return
        }
    }

    func testDelete_nonExistent_shouldNotThrow() {
        XCTAssertNoThrow({
            try KeychainHelper.delete(service: self.testService, key: "non-existent")
        })
    }

    func testDelete_multipleItems_shouldDeleteOnlyTarget() {
        let accessibility = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let key1 = "key-1"
        let key2 = "key-2"
        let value1 = "value-1"
        let value2 = "value-2"

        try? KeychainHelper.save(service: testService, key: key1, value: value1, accessibility: accessibility)
        try? KeychainHelper.save(service: testService, key: key2, value: value2, accessibility: accessibility)

        try? KeychainHelper.delete(service: testService, key: key1)

        let result1 = try? KeychainHelper.load(service: testService, key: key1)
        let result2 = try? KeychainHelper.load(service: testService, key: key2)

        XCTAssertNil(result1)
        XCTAssertEqual(result2, value2)
    }

    // MARK: - AllKeys Tests

    func testAllKeys_emptyService_shouldReturnEmptyArray() {
        let result = try? KeychainHelper.allKeys(service: testService)

        XCTAssertEqual(result, [])
    }

    func testAllKeys_withMultipleItems_shouldReturnAllKeys() {
        let accessibility = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let keys = ["key-1", "key-2", "key-3"]

        for key in keys {
            try? KeychainHelper.save(
                service: testService,
                key: key,
                value: "value-\(key)",
                accessibility: accessibility
            )
        }

        let result = try? KeychainHelper.allKeys(service: testService)

        XCTAssertEqual(Set(result ?? []), Set(keys))
    }

    func testAllKeys_afterDelete_shouldNotIncludeDeletedKey() {
        let accessibility = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let keys = ["key-1", "key-2"]

        for key in keys {
            try? KeychainHelper.save(
                service: testService,
                key: key,
                value: "value",
                accessibility: accessibility
            )
        }

        try? KeychainHelper.delete(service: testService, key: "key-1")

        let result = try? KeychainHelper.allKeys(service: testService)

        XCTAssertEqual(result, ["key-2"])
    }

    // MARK: - ClearAll Tests

    func testClearAll_emptyService_shouldNotThrow() {
        XCTAssertNoThrow({
            try KeychainHelper.clearAll(service: self.testService)
        })
    }

    func testClearAll_withItems_shouldRemoveAllItems() {
        let accessibility = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let keys = ["key-1", "key-2", "key-3"]

        for key in keys {
            try? KeychainHelper.save(
                service: testService,
                key: key,
                value: "value",
                accessibility: accessibility
            )
        }

        try? KeychainHelper.clearAll(service: testService)

        let result = try? KeychainHelper.allKeys(service: testService)

        XCTAssertEqual(result, [])
    }

    // MARK: - Data Integrity Tests

    func testSaveAndLoad_preservesData() {
        let accessibility = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let testData = "Complex data with special characters: !@#$%^&*()"

        try? KeychainHelper.save(
            service: testService,
            key: testKey,
            value: testData,
            accessibility: accessibility
        )

        let result = try? KeychainHelper.load(service: testService, key: testKey)

        XCTAssertEqual(result, testData)
    }

    func testSaveAndLoad_largeData() {
        let accessibility = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let largeData = String(repeating: "x", count: 10000)

        try? KeychainHelper.save(
            service: testService,
            key: testKey,
            value: largeData,
            accessibility: accessibility
        )

        let result = try? KeychainHelper.load(service: testService, key: testKey)

        XCTAssertEqual(result, largeData)
    }

    func testSaveAndLoad_emptyString() {
        let accessibility = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

        try? KeychainHelper.save(
            service: testService,
            key: testKey,
            value: "",
            accessibility: accessibility
        )

        let result = try? KeychainHelper.load(service: testService, key: testKey)

        XCTAssertEqual(result, "")
    }

    // MARK: - Service Isolation Tests

    func testDifferentServices_shouldBeIsolated() {
        let service1 = "com.okta.service1"
        let service2 = "com.okta.service2"
        let accessibility = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

        try? KeychainHelper.save(
            service: service1,
            key: testKey,
            value: "value1",
            accessibility: accessibility
        )

        try? KeychainHelper.save(
            service: service2,
            key: testKey,
            value: "value2",
            accessibility: accessibility
        )

        let result1 = try? KeychainHelper.load(service: service1, key: testKey)
        let result2 = try? KeychainHelper.load(service: service2, key: testKey)

        XCTAssertEqual(result1, "value1")
        XCTAssertEqual(result2, "value2")

        // Cleanup
        try? KeychainHelper.clearAll(service: service1)
        try? KeychainHelper.clearAll(service: service2)
    }

    // MARK: - Helper Methods

    private func cleanupTestKeychain() {
        try? KeychainHelper.clearAll(service: testService)
    }
}
