import Foundation
import React
import Security

@objc(SecureStorageNativeBridge)
class SecureStorageNativeBridge: NSObject {

    private let service = "com.okta.react-native"

    private func baseQuery(forKey key: String) -> [String: Any] {
        return [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            // kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
            kSecAttrService as String: service
        ]
    }

    @objc(getItem:resolver:rejecter:)
    func getItem(_ key: String,
                resolver resolve: RCTPromiseResolveBlock,
                rejecter reject: RCTPromiseRejectBlock) {

        var query: [String: Any] = baseQuery(forKey: key)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)

        if(status == errSecItemNotFound){
            resolve(nil)
            return
        }

        guard status == errSecSuccess else{

            reject("E_GET", "Keychain get failed: \(status)", nil)
            return
        }

        guard let data = item as? Data, 
              let value = String(data: data, encoding: .utf8) else{
                resolve(nil)
                return
            }

        resolve(value)
    }
    
    @objc(setItem:value:resolver:rejecter:)
    func setItem(_ key: String, value: String, 
                resolver resolve: RCTPromiseResolveBlock,
                rejecter reject: RCTPromiseRejectBlock) {

        let data = Data(value.utf8)
        var query = baseQuery(forKey: key)

        let attributesToUpdate: [String: Any] = [kSecValueData as String: data];
        let updateStatus = SecItemUpdate(query as CFDictionary, attributesToUpdate as CFDictionary)


        if updateStatus == errSecSuccess {
            resolve(nil)
        } else if updateStatus == errSecItemNotFound {
            query[kSecValueData as String] = data
            query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock

            let addStatus = SecItemAdd(query as CFDictionary, nil)

            if(addStatus == errSecSuccess){
                resolve(nil)
            } else {
               reject("E_SET", "Keychain Set failed: \(addStatus)", nil) 
            }
        }else {
            reject("E_SET", "Keychain Set failed: \(updateStatus)", nil)
        }

        
    }

    @objc(removeItem:resolver:rejecter:)
    func removeItem(_ key: String, 
                resolver resolve: RCTPromiseResolveBlock,
                rejecter reject: RCTPromiseRejectBlock) {

        let query = baseQuery(forKey: key)
        let status = SecItemDelete(query as CFDictionary)

        if(status == errSecSuccess || status == errSecItemNotFound){
            resolve(true)
        } else {
            reject("E_REMOVE", "Keychain remove failed: \(status)", nil)
        }
    }

    @objc(clear:rejecter:)
    func clear(_ resolve: RCTPromiseResolveBlock,
                rejecter reject: RCTPromiseRejectBlock){

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword, 
            kSecAttrService as String: service
        ]
        let status = SecItemDelete(query as CFDictionary)
        if(status == errSecSuccess || status == errSecItemNotFound){
            resolve(true)
        } else {
            reject("E_CLEAR", "Keychain clear failed: \(status)", nil)
        }
    }
}