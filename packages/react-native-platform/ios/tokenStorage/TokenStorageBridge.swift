import Foundation
import Security
import React

@objc(TokenStorageBridge)
class TokenStorageBridge: NSObject {
    
    private static let SERVICE_TOKENS = "com.okta.auth-foundation.tokens"
    private static let SERVICE_METADATA = "com.okta.auth-foundation.metadata"
    private static let DEFAULT_TOKEN_KEY = "okta-default-token"
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    // MARK: - Token Operations (Secure Storage - Keychain)
    
    @objc
    func saveToken(_ id: String, tokenData: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            try KeychainHelper.save(service: Self.SERVICE_TOKENS, key: id, value: tokenData)
            resolve(nil)
        } catch {
            reject("token_save_error", "Failed to save token", error)
        }
    }
    
    @objc
    func getToken(_ id: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            let value = try KeychainHelper.load(service: Self.SERVICE_TOKENS, key: id)
            resolve(value)
        } catch {
            resolve(nil)
        }
    }
    
    @objc
    func removeToken(_ id: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            try KeychainHelper.delete(service: Self.SERVICE_TOKENS, key: id)
            UserDefaults.standard.removeObject(forKey: metadataKey(id))
            resolve(nil)
        } catch {
            reject("token_remove_error", "Failed to remove token", error)
        }
    }
    
    @objc
    func getAllTokenIds(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            let keys = try KeychainHelper.allKeys(service: Self.SERVICE_TOKENS)
            resolve(keys)
        } catch {
            reject("token_list_error", "Failed to get token IDs", error)
        }
    }
    
    @objc
    func clearTokens(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        do {
            try KeychainHelper.clearAll(service: Self.SERVICE_TOKENS)
            try KeychainHelper.clearAll(service: Self.SERVICE_METADATA)
            UserDefaults.standard.removeObject(forKey: Self.DEFAULT_TOKEN_KEY)
            resolve(nil)
        } catch {
            reject("token_clear_error", "Failed to clear tokens", error)
        }
    }
    
    // MARK: - Metadata Operations (Regular Storage - UserDefaults)
    
    @objc
    func saveMetadata(_ id: String, metadataData: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        UserDefaults.standard.set(metadataData, forKey: metadataKey(id))
        resolve(nil)
    }
    
    @objc
    func getMetadata(_ id: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        let value = UserDefaults.standard.string(forKey: metadataKey(id))
        resolve(value)
    }
    
    @objc
    func removeMetadata(_ id: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        UserDefaults.standard.removeObject(forKey: metadataKey(id))
        resolve(nil)
    }
    
    // MARK: - Default Token ID
    
    @objc
    func setDefaultTokenId(_ id: String?, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if let id = id {
            UserDefaults.standard.set(id, forKey: Self.DEFAULT_TOKEN_KEY)
        } else {
            UserDefaults.standard.removeObject(forKey: Self.DEFAULT_TOKEN_KEY)
        }
        resolve(nil)
    }
    
    @objc
    func getDefaultTokenId(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        let value = UserDefaults.standard.string(forKey: Self.DEFAULT_TOKEN_KEY)
        resolve(value)
    }
    
    // MARK: - Helpers
    
    private func metadataKey(_ id: String) -> String {
        return "metadata:\(id)"
    }
}

// MARK: - Keychain Helper

class KeychainHelper {
    
    static func save(service: String, key: String, value: String) throws {
        let data = value.data(using: .utf8)!
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        
        // Delete existing item first
        SecItemDelete(query as CFDictionary)
        
        let status = SecItemAdd(query as CFDictionary, nil)
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
        
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw NSError(domain: NSOSStatusErrorDomain, code: Int(status))
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
        
        SecItemDelete(query as CFDictionary)
    }
}