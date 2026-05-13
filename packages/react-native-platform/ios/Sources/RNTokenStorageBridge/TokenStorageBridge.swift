import Foundation
import Security
import React

@objc(TokenStorageBridge)
class TokenStorageBridge: NSObject, RCTBridgeModule {

    override init() {
            super.init()
            print("✅ TokenStorageBridge initialized!")
            // Debug: Print all methods
            let methodCount = UnsafeMutablePointer<UInt32>.allocate(capacity: 1)
            let methods = class_copyMethodList(type(of: self), methodCount)
            print("📋 TokenStorageBridge methods:")
            for i in 0..<Int(methodCount.pointee) {
                if let method = methods?[i] {
                    print("  - \(NSStringFromSelector(method_getName(method)))")
                }
            }
            free(methods)
        }

    private static let SERVICE_TOKENS = "com.okta.auth-foundation.tokens"
    private static let SERVICE_METADATA = "com.okta.auth-foundation.metadata"
    private static let SERVICE_DEFAULT = "com.okta.auth-foundation.default"

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc
    static func moduleName() -> String! {
        return "TokenStorageBridge"
    }

    @objc
    func constantsToExport() -> [String: Any]! {
        return [
            "isAvailable": true
        ]
    }

    // MARK: - Token Operations (Secure Storage - Keychain with strict access)

    @objc(saveToken:tokenData:resolve:reject:)
    func saveToken(_ id: String, tokenData: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            // More restrictive: requires device unlock
            try KeychainHelper.save(
                service: Self.SERVICE_TOKENS,
                key: id,
                value: tokenData,
                accessibility: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            )
            resolve(nil as Any?)
        } catch {
            reject("token_save_error", "Failed to save token", error)
        }
    }

    @objc(getToken:resolve:reject:)
    func getToken(_ id: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            let value = try KeychainHelper.load(service: Self.SERVICE_TOKENS, key: id)
            resolve(value)
        } catch {
            resolve(nil as Any?)
        }
    }

    @objc(removeToken:resolve:reject:)
    func removeToken(_ id: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            try KeychainHelper.delete(service: Self.SERVICE_TOKENS, key: id)
            try KeychainHelper.delete(service: Self.SERVICE_METADATA, key: id)
            resolve(nil as Any?)
        } catch {
            reject("token_remove_error", "Failed to remove token", error)
        }
    }

    @objc(getAllTokenIds:reject:)
    func getAllTokenIds(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            let keys = try KeychainHelper.allKeys(service: Self.SERVICE_TOKENS)
            resolve(keys)
        } catch {
            reject("token_list_error", "Failed to get token IDs", error)
        }
    }

    @objc(clearTokens:reject:)
    func clearTokens(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            try KeychainHelper.clearAll(service: Self.SERVICE_TOKENS)
            try KeychainHelper.clearAll(service: Self.SERVICE_METADATA)
            try KeychainHelper.clearAll(service: Self.SERVICE_DEFAULT)
            resolve(nil as Any?)
        } catch {
            reject("token_clear_error", "Failed to clear tokens", error)
        }
    }

    // MARK: - Metadata Operations (Keychain with relaxed access)

    @objc(saveMetadata:metadataData:resolve:reject:)
    func saveMetadata(_ id: String, metadataData: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            // Less restrictive: accessible after first unlock (survives reboots)
            try KeychainHelper.save(
                service: Self.SERVICE_METADATA,
                key: id,
                value: metadataData,
                accessibility: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            )
            resolve(nil as Any?)
        } catch {
            reject("metadata_save_error", "Failed to save metadata", error)
        }
    }

    @objc(getMetadata:resolve:reject:)
    func getMetadata(_ id: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            let value = try KeychainHelper.load(service: Self.SERVICE_METADATA, key: id)
            resolve(value)
        } catch {
            resolve(nil as Any?)
        }
    }

    @objc(removeMetadata:resolve:reject:)
    func removeMetadata(_ id: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            try KeychainHelper.delete(service: Self.SERVICE_METADATA, key: id)
            resolve(nil as Any?)
        } catch {
            reject("metadata_remove_error", "Failed to remove metadata", error)
        }
    }

    // MARK: - Default Token ID (Keychain with relaxed access)

    @objc(setDefaultTokenId:resolve:reject:)
    func setDefaultTokenId(_ id: String?, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            if let id = id {
                try KeychainHelper.save(
                    service: Self.SERVICE_DEFAULT,
                    key: "default",
                    value: id,
                    accessibility: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
                )
            } else {
                try KeychainHelper.delete(service: Self.SERVICE_DEFAULT, key: "default")
            }
            resolve(nil as Any?)
        } catch {
            reject("default_token_error", "Failed to set default token ID", error)
        }
    }

    @objc(getDefaultTokenId:reject:)
    func getDefaultTokenId(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            let value = try KeychainHelper.load(service: Self.SERVICE_DEFAULT, key: "default")
            resolve(value)
        } catch {
            resolve(nil as Any?)
        }
    }
}

// MARK: - Keychain Helper

class KeychainHelper {
    
    static func save(
        service: String,
        key: String,
        value: String,
        accessibility: CFString
    ) throws {
        let data = value.data(using: .utf8)!

        // Query for adding new item
        let addQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: accessibility
        ]

        // First try to delete any existing item (use minimal query)
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(deleteQuery as CFDictionary)

        // Now add the new item
        let status = SecItemAdd(addQuery as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw NSError(domain: NSOSStatusErrorDomain, code: Int(status))
        }
    }
    
    static func load(service: String, key: String) throws -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess else {
            if status == errSecItemNotFound {
                return nil
            }
            throw NSError(domain: NSOSStatusErrorDomain, code: Int(status))
        }
        
        guard let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }
        
        return value
    }
    
    static func delete(service: String, key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        // Loop to delete all items matching the query (defensive against duplicates)
        while true {
            let status = SecItemDelete(query as CFDictionary)
            if status == errSecItemNotFound {
                break
            } else if status != errSecSuccess {
                throw NSError(domain: NSOSStatusErrorDomain, code: Int(status))
            }
            // If successful, loop again to ensure all items are deleted
        }
    }
    
    static func allKeys(service: String) throws -> [String] {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecReturnAttributes as String: true,
            kSecMatchLimit as String: kSecMatchLimitAll
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess else {
            if status == errSecItemNotFound {
                return []
            }
            throw NSError(domain: NSOSStatusErrorDomain, code: Int(status))
        }
        
        guard let items = result as? [[String: Any]] else {
            return []
        }
        
        return items.compactMap { $0[kSecAttrAccount as String] as? String }
    }
    
    static func clearAll(service: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service
        ]

        // SecItemDelete only deletes one item per call, so loop until empty
        while true {
            let status = SecItemDelete(query as CFDictionary)
            if status == errSecItemNotFound {
                // No more items to delete
                break
            } else if status != errSecSuccess {
                throw NSError(domain: NSOSStatusErrorDomain, code: Int(status))
            }
            // If successful, loop again to delete next item
        }
    }
}
