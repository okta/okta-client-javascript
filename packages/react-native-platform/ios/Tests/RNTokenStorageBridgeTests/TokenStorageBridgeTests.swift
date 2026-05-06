import XCTest
import Security
@testable import RNTokenStorageBridge

class TokenStorageBridgeTests: XCTestCase {

    var sut: TokenStorageBridge!

    override func setUp() {
        super.setUp()
        sut = TokenStorageBridge()
        cleanupKeychain()
    }

    override func tearDown() {
        super.tearDown()
        cleanupKeychain()
    }

    // MARK: - Token Operations Tests

    func testSaveToken_shouldSucceed() {
        let expectation = XCTestExpectation(description: "Save token")

        sut.saveToken("test-id", tokenData: "test-token-data", resolve: { _ in
            expectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Should not reject")
            expectation.fulfill()
        })

        wait(for: [expectation], timeout: 1.0)
    }

    func testSaveAndGetToken_shouldReturnSavedToken() {
        let saveExpectation = XCTestExpectation(description: "Save token")
        let getExpectation = XCTestExpectation(description: "Get token")
        var savedTokenValue: String?

        sut.saveToken("test-id", tokenData: "test-token-data", resolve: { _ in
            saveExpectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Save should not reject")
            saveExpectation.fulfill()
        })

        wait(for: [saveExpectation], timeout: 1.0)

        sut.getToken("test-id", resolve: { token in
            savedTokenValue = token as? String
            getExpectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Get should not reject")
            getExpectation.fulfill()
        })

        wait(for: [getExpectation], timeout: 1.0)
        XCTAssertEqual(savedTokenValue, "test-token-data")
    }

    func testGetToken_nonExistent_shouldReturnNil() {
        let expectation = XCTestExpectation(description: "Get non-existent token")
        var result: String?

        sut.getToken("non-existent", resolve: { token in
            result = token as? String
            expectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Should not reject")
            expectation.fulfill()
        })

        wait(for: [expectation], timeout: 1.0)
        XCTAssertNil(result)
    }

    func testRemoveToken_shouldRemoveTokenAndMetadata() {
        let saveTokenExp = XCTestExpectation(description: "Save token")
        let saveMetaExp = XCTestExpectation(description: "Save metadata")
        let removeExp = XCTestExpectation(description: "Remove token")
        let getTokenExp = XCTestExpectation(description: "Get removed token")
        var retrievedToken: String?

        sut.saveToken("test-id", tokenData: "test-data", resolve: { _ in
            saveTokenExp.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Save token should not reject")
            saveTokenExp.fulfill()
        })

        sut.saveMetadata("test-id", metadataData: "test-meta", resolve: { _ in
            saveMetaExp.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Save metadata should not reject")
            saveMetaExp.fulfill()
        })

        wait(for: [saveTokenExp, saveMetaExp], timeout: 1.0)

        sut.removeToken("test-id", resolve: { _ in
            removeExp.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Remove should not reject")
            removeExp.fulfill()
        })

        wait(for: [removeExp], timeout: 1.0)

        sut.getToken("test-id", resolve: { token in
            retrievedToken = token as? String
            getTokenExp.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Get should not reject")
            getTokenExp.fulfill()
        })

        wait(for: [getTokenExp], timeout: 1.0)
        XCTAssertNil(retrievedToken)
    }

    func testGetAllTokenIds_emptyStorage_shouldReturnEmptyArray() {
        let expectation = XCTestExpectation(description: "Get all token IDs")
        var result: [String]?

        sut.getAllTokenIds({ ids in
            result = ids as? [String]
            expectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Should not reject")
            expectation.fulfill()
        })

        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(result, [])
    }

    func testGetAllTokenIds_withMultipleTokens_shouldReturnIds() {
        let save1Exp = XCTestExpectation(description: "Save token 1")
        let save2Exp = XCTestExpectation(description: "Save token 2")
        let getAllExp = XCTestExpectation(description: "Get all IDs")
        var result: [String]?

        sut.saveToken("token-1", tokenData: "data-1", resolve: { _ in
            save1Exp.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Save 1 should not reject")
            save1Exp.fulfill()
        })

        sut.saveToken("token-2", tokenData: "data-2", resolve: { _ in
            save2Exp.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Save 2 should not reject")
            save2Exp.fulfill()
        })

        wait(for: [save1Exp, save2Exp], timeout: 1.0)

        sut.getAllTokenIds({ ids in
            result = ids as? [String]
            getAllExp.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Should not reject")
            getAllExp.fulfill()
        })

        wait(for: [getAllExp], timeout: 1.0)
        XCTAssertEqual(Set(result ?? []), Set(["token-1", "token-2"]))
    }

    func testClearTokens_shouldRemoveAllTokens() {
        let save1Exp = XCTestExpectation(description: "Save token 1")
        let save2Exp = XCTestExpectation(description: "Save token 2")
        let clearExp = XCTestExpectation(description: "Clear tokens")
        let getAllExp = XCTestExpectation(description: "Get all IDs after clear")
        var result: [String]?

        sut.saveToken("token-1", tokenData: "data-1", resolve: { _ in
            save1Exp.fulfill()
        }, reject: { _, _, _ in
            save1Exp.fulfill()
        })

        sut.saveToken("token-2", tokenData: "data-2", resolve: { _ in
            save2Exp.fulfill()
        }, reject: { _, _, _ in
            save2Exp.fulfill()
        })

        wait(for: [save1Exp, save2Exp], timeout: 1.0)

        sut.clearTokens({ _ in
            clearExp.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Clear should not reject")
            clearExp.fulfill()
        })

        wait(for: [clearExp], timeout: 1.0)

        sut.getAllTokenIds({ ids in
            result = ids as? [String]
            getAllExp.fulfill()
        }, reject: { _, _, _ in
            getAllExp.fulfill()
        })

        wait(for: [getAllExp], timeout: 1.0)
        XCTAssertEqual(result, [])
    }

    // MARK: - Metadata Operations Tests

    func testSaveMetadata_shouldSucceed() {
        let expectation = XCTestExpectation(description: "Save metadata")

        sut.saveMetadata("test-id", metadataData: "test-metadata", resolve: { _ in
            expectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Should not reject")
            expectation.fulfill()
        })

        wait(for: [expectation], timeout: 1.0)
    }

    func testSaveAndGetMetadata_shouldReturnSavedMetadata() {
        let saveExpectation = XCTestExpectation(description: "Save metadata")
        let getExpectation = XCTestExpectation(description: "Get metadata")
        var savedMetadata: String?

        sut.saveMetadata("test-id", metadataData: "test-metadata", resolve: { _ in
            saveExpectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Save should not reject")
            saveExpectation.fulfill()
        })

        wait(for: [saveExpectation], timeout: 1.0)

        sut.getMetadata("test-id", resolve: { metadata in
            savedMetadata = metadata as? String
            getExpectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Get should not reject")
            getExpectation.fulfill()
        })

        wait(for: [getExpectation], timeout: 1.0)
        XCTAssertEqual(savedMetadata, "test-metadata")
    }

    func testGetMetadata_nonExistent_shouldReturnNil() {
        let expectation = XCTestExpectation(description: "Get non-existent metadata")
        var result: String?

        sut.getMetadata("non-existent", resolve: { metadata in
            result = metadata as? String
            expectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Should not reject")
            expectation.fulfill()
        })

        wait(for: [expectation], timeout: 1.0)
        XCTAssertNil(result)
    }

    func testRemoveMetadata_shouldRemoveMetadata() {
        let saveExpectation = XCTestExpectation(description: "Save metadata")
        let removeExpectation = XCTestExpectation(description: "Remove metadata")
        let getExpectation = XCTestExpectation(description: "Get removed metadata")
        var result: String?

        sut.saveMetadata("test-id", metadataData: "test-metadata", resolve: { _ in
            saveExpectation.fulfill()
        }, reject: { _, _, _ in
            saveExpectation.fulfill()
        })

        wait(for: [saveExpectation], timeout: 1.0)

        sut.removeMetadata("test-id", resolve: { _ in
            removeExpectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Remove should not reject")
            removeExpectation.fulfill()
        })

        wait(for: [removeExpectation], timeout: 1.0)

        sut.getMetadata("test-id", resolve: { metadata in
            result = metadata as? String
            getExpectation.fulfill()
        }, reject: { _, _, _ in
            getExpectation.fulfill()
        })

        wait(for: [getExpectation], timeout: 1.0)
        XCTAssertNil(result)
    }

    // MARK: - Default Token ID Tests

    func testSetDefaultTokenId_shouldSucceed() {
        let expectation = XCTestExpectation(description: "Set default token ID")

        sut.setDefaultTokenId("default-id", resolve: { _ in
            expectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Should not reject")
            expectation.fulfill()
        })

        wait(for: [expectation], timeout: 1.0)
    }

    func testSetAndGetDefaultTokenId_shouldReturnSavedId() {
        let setExpectation = XCTestExpectation(description: "Set default")
        let getExpectation = XCTestExpectation(description: "Get default")
        var savedId: String?

        sut.setDefaultTokenId("default-id", resolve: { _ in
            setExpectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Set should not reject")
            setExpectation.fulfill()
        })

        wait(for: [setExpectation], timeout: 1.0)

        sut.getDefaultTokenId({ id in
            savedId = id as? String
            getExpectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Get should not reject")
            getExpectation.fulfill()
        })

        wait(for: [getExpectation], timeout: 1.0)
        XCTAssertEqual(savedId, "default-id")
    }

    func testGetDefaultTokenId_notSet_shouldReturnNil() {
        let expectation = XCTestExpectation(description: "Get default not set")
        var result: String?

        sut.getDefaultTokenId({ id in
            result = id as? String
            expectation.fulfill()
        }, reject: { _, _, _ in
            XCTFail("Should not reject")
            expectation.fulfill()
        })

        wait(for: [expectation], timeout: 1.0)
        XCTAssertNil(result)
    }

    // MARK: - Helper Methods

    private func cleanupKeychain() {
        let services = [
            "com.okta.auth-foundation.tokens",
            "com.okta.auth-foundation.metadata",
            "com.okta.auth-foundation.default"
        ]

        for service in services {
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service
            ]
            SecItemDelete(query as CFDictionary)
        }
    }
}
