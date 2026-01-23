import Foundation
import React
import Security
import CryptoKit
import CommonCrypto

@objc(WebCryptoNativeBridge)
class WebCryptoNativeBridge: NSObject {
    @objc static func requiresMainQueueSetup() -> Bool {return false}    

    let oid_ecPublicKey: [UInt64] = [1, 2, 840, 10045, 2, 1]
    let oid_prime256v1: [UInt64] = [1, 2, 840, 10045, 3, 1, 7]
    let oid_secp384r1: [UInt64] = [1, 3, 132, 0, 34]
    let oid_secp521r1: [UInt64] = [1, 3, 132, 0, 35]
    
    @objc(digest:dataBase64:resolver:rejecter:)
    func digest(
        _ algorithm: String,
        dataBase64: String,
        resolver resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        do {
            guard let data = Data(base64Encoded: dataBase64) else {
                throw NSError(domain: "WebCryptoNativeBridgeModule", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid base64 input data"])
            }
       
            let algo = algorithm.uppercased()
            let digestData: Data

            switch algo {
            case "SHA-256":
                digestData = Data(SHA256.hash(data: data))
            case "SHA-384":
                digestData = Data(SHA384.hash(data: data))
            case "SHA-512":
                digestData = Data(SHA512.hash(data: data))
            case "SHA-1":
                digestData = try sha1(data)
            default:
                throw NSError(domain: "WebCryptoNativeBridgeModule", code: 2, userInfo: [NSLocalizedDescriptionKey: "Unsupported algorithm: \(algorithm)"])
            }

            let digestBase64 = digestData.base64EncodedString()
            resolve(digestBase64)

        } catch {
            reject("WebCryptoNativeBridgeModule.digest", (error as NSError).localizedDescription, error)
        }
        
    } 

    @objc(randomUUID:rejecter:)
    func randomUUID(
        _ resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        let uuid = UUID().uuidString
        resolve(uuid)   
    }

    @objc(generateKey:extractable:keyUsages:resolver:rejecter:)
    func generateKey(
        _ algorithm: NSDictionary,
        extractable: Bool,
        keyUsages: NSArray,
        resolver resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        do {
            guard let nameRaw = algorithm["name"] as? String else {
                throw NSError(domain: "WebCryptoNativeBridgeModule", code: 200, userInfo: [NSLocalizedDescriptionKey: "Algorithm name is required"])
            }

            let name = nameRaw.uppercased()

            let usages = keyUsages.compactMap { $0 as? String }

            switch name {
                case "HMAC":
                    guard let hash = (algorithm["hash"] as? NSDictionary)?["name"] as? String else {
                        throw NSError(domain: "WebCryptoNativeBridgeModule", code: 201, userInfo: [NSLocalizedDescriptionKey: "HMAC hash algorithm is required"])
                    }
                    let lengthBits = (algorithm["length"] as? Int) ?? 256
                    if lengthBits % 8 != 0 {
                        throw NSError(domain: "WebCryptoNativeBridgeModule", code: 202, userInfo: [NSLocalizedDescriptionKey: "HMAC length must be a multiple of 8"])
                    }

                    var keyBytes = [UInt8](repeating: 0, count: lengthBits / 8)
                    let status = SecRandomCopyBytes(kSecRandomDefault, keyBytes.count, &keyBytes)
                    if status != errSecSuccess {
                        throw NSError(domain: "WebCryptoNativeBridgeModule", code: 203, userInfo: [NSLocalizedDescriptionKey: "Failed to generate random bytes"])
                    }

                    let key = makeKeyDict(
                        type: "secret",
                        algorithm: algorithm,
                        extractable: extractable,
                        usages: usages,
                        format: "raw",
                        data: dataToB64(Data(keyBytes))
                    )
                    resolve(key)
                case "ECDSA":
                    guard let namedCurve = algorithm["namedCurve"] as? String else {
                        throw NSError(domain: "WebCryptoNativeBridgeModule", code: 210, userInfo: [NSLocalizedDescriptionKey: "ECDSA namedCurve is required"])
                    }

                    let pubSpkiB64: String
                    let privPkcs8B64: String

                    if namedCurve == "P-256" {
                        let privateKey = P256.Signing.PrivateKey()
                        let publicKey = privateKey.publicKey

                        let data = privateKey.rawRepresentation
                        let x963Pub = publicKey.x963Representation

                        let spkiData = try ecSpkiFromx963PublicKey(x963Pub, namedCurve: namedCurve)
                        let pkcs8Data = try ecPkcs8FromPrivateScalar(data, x963PublicKey: x963Pub, namedCurve: namedCurve)

                        pubSpkiB64 = dataToB64(spkiData)
                        privPkcs8B64 = dataToB64(pkcs8Data)
                    } else if namedCurve == "P-384" {
                        let privateKey = P384.Signing.PrivateKey()
                        let publicKey = privateKey.publicKey

                        let data = privateKey.rawRepresentation
                        let x963Pub = publicKey.x963Representation

                        let spkiData = try ecSpkiFromx963PublicKey(x963Pub, namedCurve: namedCurve)
                        let pkcs8Data = try ecPkcs8FromPrivateScalar(data, x963PublicKey: x963Pub, namedCurve: namedCurve)

                        pubSpkiB64 = dataToB64(spkiData)
                        privPkcs8B64 = dataToB64(pkcs8Data)
                    } else if namedCurve == "P-521" {
                        let privateKey = P521.Signing.PrivateKey()
                        let publicKey = privateKey.publicKey

                        let data = privateKey.rawRepresentation
                        let x963Pub = publicKey.x963Representation

                        let spkiData = try ecSpkiFromx963PublicKey(x963Pub, namedCurve: namedCurve)
                        let pkcs8Data = try ecPkcs8FromPrivateScalar(data, x963PublicKey: x963Pub, namedCurve: namedCurve)

                        pubSpkiB64 = dataToB64(spkiData)
                        privPkcs8B64 = dataToB64(pkcs8Data)
                    } else {
                        throw NSError(domain: "WebCryptoNativeBridgeModule", code: 211, userInfo: [NSLocalizedDescriptionKey: "Unsupported named curve: \(namedCurve)"])
                    }

                    let publicKey = makeKeyDict(
                        type: "public",
                        algorithm: algorithm,
                        extractable: true,
                        usages: usages,
                        format: "spki",
                        data: pubSpkiB64
                    )
                    let privateKey = makeKeyDict(
                        type: "private",
                        algorithm: algorithm,
                        extractable: extractable,
                        usages: usages,
                        format: "pkcs8",
                        data: privPkcs8B64
                    )

                    resolve([
                        "publicKey": publicKey,
                        "privateKey": privateKey
                    ])
                default:
                    throw NSError(domain: "WebCryptoNativeBridgeModule", code: 299, userInfo: [NSLocalizedDescriptionKey: "Unsupported algorithm: \(name)"])
            
            }

        } catch {
            reject("WebCryptoNativeBridgeModule.generateKey", (error as NSError).localizedDescription, error)
        }    
    }

    @objc(importKey:keyData:algorithm:extractable:keyUsages:resolver:rejecter:)
    func importKey(
        _ format: String,
        keyData: String,
        algorithm: NSDictionary,
        extractable: Bool,
        keyUsages: NSArray,
        resolver resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        do {
            guard let nameRaw = algorithm["name"] as? String else {
                throw NSError(domain: "WebCryptoNativeBridgeModule", code: 300, userInfo: [NSLocalizedDescriptionKey: "Algorithm name is required"])
            }

            let name = nameRaw.uppercased()

            let formatLower = format.lowercased()
            let usages = keyUsages.compactMap { $0 as? String }

            switch name {
                case "HMAC":
                    if(formatLower != "raw" ){
                        throw NSError(domain: "WebCryptoNativeBridgeModule", code: 301, userInfo: [NSLocalizedDescriptionKey: "HMAC only supports 'raw' key format"])
                    }
                    _ = try b64ToData(keyData)
                    let key = makeKeyDict(
                        type: "secret",
                        algorithm: algorithm,
                        extractable: extractable,
                        usages: usages,
                        format: formatLower,
                        data: keyData
                    )
                    resolve(key)
                case "ECDSA":
                    if(formatLower != "spki" && formatLower != "pkcs8" ){
                        throw NSError(domain: "WebCryptoNativeBridgeModule", code: 310, userInfo: [NSLocalizedDescriptionKey: "ECDSA only supports 'spki' and 'pkcs8' key formats"])
                    }

                    let der = try b64ToData(keyData)
                    if(formatLower == "spki") {
                        _ = try parseEcSpki(der)
                        let key = makeKeyDict(
                            type: "public",
                            algorithm: algorithm,
                            extractable: extractable,
                            usages: usages,
                            format: formatLower,
                            data: keyData
                        )
                        resolve(key)
                    } else {
                        _ = try parseEcPkcs8(der)
                        let key = makeKeyDict(
                            type: "private",
                            algorithm: algorithm,
                            extractable: extractable,
                            usages: usages,
                            format: formatLower,
                            data: keyData
                        )
                        resolve(key)
                    }
                default:
                    throw NSError(domain: "WebCryptoNativeBridgeModule", code: 399, userInfo: [NSLocalizedDescriptionKey: "Unsupported algorithm: \(name)"])

            }
        } catch {
            reject("WebCryptoNativeBridgeModule.importKey", (error as NSError).localizedDescription, error)
        } 
    }

    @objc(sign:key:dataBase64:resolver:rejecter:)
    func sign(
        _ algorithm: NSDictionary,
        key: NSDictionary,
        dataBase64: String,
        resolver resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        do {
            guard let nameRaw = algorithm["name"] as? String else {
                throw NSError(domain: "WebCryptoNativeBridgeModule", code: 400, userInfo: [NSLocalizedDescriptionKey: "Algorithm name is required"])
            }

            let name = nameRaw.uppercased()

            let data = try b64ToData(dataBase64)
            guard let keyType = key["type"] as? String,
                  let keyFormat = (key["format"] as? String)?.lowercased(),
                  let keyDataB64 = key["data"] as? String 
            else {
                throw NSError(domain: "WebCryptoNativeBridgeModule", code: 401, userInfo: [NSLocalizedDescriptionKey: "Invalid key object"])
            }    

            switch name {
                case "HMAC":
                    if(keyType != "secret" || keyFormat != "raw") {
                        throw NSError(domain: "WebCryptoNativeBridgeModule", code: 410, userInfo: [NSLocalizedDescriptionKey: "Invalid key for HMAC signing"])
                    }
                    guard let hash = (algorithm["hash"] as? NSDictionary)?["name"] as? String else {
                        throw NSError(domain: "WebCryptoNativeBridgeModule", code: 411, userInfo: [NSLocalizedDescriptionKey: "HMAC hash algorithm is required"])
                    }

                    let rawKey = try b64ToData(keyDataB64)
                    let symKey = SymmetricKey(data: rawKey)

                    let signatureData: Data
                    switch hash.uppercased() {
                        case "SHA-256":
                            signatureData = Data(HMAC<SHA256>.authenticationCode(for: data, using: symKey))
                        case "SHA-384":
                            signatureData = Data(HMAC<SHA384>.authenticationCode(for: data, using: symKey))
                        case "SHA-512":
                            signatureData = Data(HMAC<SHA512>.authenticationCode(for: data, using: symKey))
                        default:
                            throw NSError(domain: "WebCryptoNativeBridgeModule", code: 412, userInfo: [NSLocalizedDescriptionKey: "Unsupported HMAC hash algorithm: \(hash)"])
                    }

                    resolve(dataToB64(signatureData))
                case "ECDSA":
                    guard let hash = (algorithm["hash"] as? NSDictionary)?["name"] as? String else {
                        throw NSError(domain: "WebCryptoNativeBridgeModule", code: 420, userInfo: [NSLocalizedDescriptionKey: "ECDSA hash algorithm is required"])
                    }
                    if(keyType != "private" || keyFormat != "pkcs8") {
                        throw NSError(domain: "WebCryptoNativeBridgeModule", code: 421, userInfo: [NSLocalizedDescriptionKey: "Invalid key for ECDSA signing"])
                    }

                    let pkcs8Data = try b64ToData(keyDataB64)
                    let parsed = try parseEcPkcs8(pkcs8Data)
                    let namedCurve = parsed.namedCurve
                    let data = parsed.data

                    let signatureData: Data
                    if(namedCurve == "P-256") {
                        let privateKey = try P256.Signing.PrivateKey(rawRepresentation: data)
                        let signature = try privateKey.signature(for: data)
                        signatureData = signature.derRepresentation
                    } else if(namedCurve == "P-384") {
                        let privateKey = try P384.Signing.PrivateKey(rawRepresentation: data)
                        let signature = try privateKey.signature(for: data)
                        signatureData = signature.derRepresentation
                    } else if(namedCurve == "P-521") {
                        let privateKey = try P521.Signing.PrivateKey(rawRepresentation: data)
                        let signature = try privateKey.signature(for: data)
                        signatureData = signature.derRepresentation
                    } else {
                        throw NSError(domain: "WebCryptoNativeBridgeModule", code: 422, userInfo: [NSLocalizedDescriptionKey: "Unsupported named curve: \(namedCurve)"])
                    }

                    resolve(dataToB64(signatureData))
                default:
                    throw NSError(domain: "WebCryptoNativeBridgeModule", code: 499, userInfo: [NSLocalizedDescriptionKey: "Unsupported algorithm: \(name)"])
            }

                    
        } catch {
            reject("WebCryptoNativeBridgeModule.sign", (error as NSError).localizedDescription, error)
        }
    }

}

