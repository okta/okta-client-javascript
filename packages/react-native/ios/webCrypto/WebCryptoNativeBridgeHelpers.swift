import Foundation
import Security
import CryptoKit
import CommonCrypto

extension WebCryptoNativeBridge{
    func b64ToData(_ b64: String) throws -> Data {
        guard let data = Data(base64Encoded: b64) else {
            throw NSError(domain: "WebCryptoNativeBridgeModule", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid base64 input data"])
        }
        return data
    }

    func dataToB64(_ data: Data) -> String {
        return data.base64EncodedString(options: [.endLineWithLineFeed]).replacingOccurrences(of: "\n", with: "")
    }

    func algoHashToDigest(_name: String) throws -> String{
        let name = _name.uppercased()
        switch name {
        case "SHA-1":
            return "SHA1"
        case "SHA-256":
            return "SHA256"
        case "SHA-384":
            return "SHA384"
        case "SHA-512":
            return "SHA512"
        default:
            throw NSError(domain: "WebCryptoNativeBridgeModule", code: 2, userInfo: [NSLocalizedDescriptionKey: "Unsupported algorithm: \(_name)"])
        }
    }

      func ensureValidLength(_ length: Int) throws {
        if length <= 0 || length > 65536 {
            throw NSError(domain: "WebCryptoNativeBridgeModule", code: 3, userInfo: [NSLocalizedDescriptionKey: "Invalid length: \(length). Must be between 1 and 65536"])
        }
    }

    func makeKeyDict(
    type: String,
    algorithm: NSDictionary,
    extractable: Bool,
    usages: [String],
    format: String,
    data: String
    ) -> NSDictionary {
        return [
            "type": type,
            "algorithm": algorithm,
            "extractable": extractable,
            "usages": usages,
            "format": format,
            "data": data
        ]
    }



    func curveOid(namedCurve: String) throws -> [UInt64] {
        switch namedCurve {
        case "P-256":
            return oid_prime256v1
        case "P-384":
            return oid_secp384r1
        case "P-521":
            return oid_secp521r1
        default:
            throw NSError(domain: "WebCryptoNativeBridgeModule", code: 10, userInfo: [NSLocalizedDescriptionKey: "Unsupported named curve: \(namedCurve)"])
        }
    }

    func namedCurve(fromOid oid: [UInt64]) throws -> String {
        if oid == oid_prime256v1 {
            return "P-256"
        } else if oid == oid_secp384r1 {
            return "P-384"
        } else if oid == oid_secp521r1 {
            return "P-521"
        } else {
            throw NSError(domain: "WebCryptoNativeBridgeModule", code: 11, userInfo: [NSLocalizedDescriptionKey: "Unsupported curve OID: \(oid)"])
        }
    }

    func derLen(_ n: Int) -> Data {
        if (n < 0x80) {
            return Data([UInt8(n)])
        } else {
            var x = n
            var bytes: [UInt8] = []
            while x > 0 {
                bytes.insert(UInt8(x & 0xFF), at: 0)
                x = x >> 8
            }
            let lengthByte = 0x80 | UInt8(bytes.count)
            return Data([lengthByte] + bytes)
        }
    }

    func derTLV(tag: UInt8, value: Data) -> Data {
        var data = Data([tag])
        data.append(derLen(value.count))
        data.append(value)
        return data
    }

    func derSequence(_ elements: [Data]) -> Data {
        let value = elements.reduce(Data(), +)
        return derTLV(tag: 0x30, value: value)
    }

    func derInteger(_ n: Int) -> Data {
        var v = Data()
        var x = n

        var bytes: [UInt8] = []
        while x > 0 {
            bytes.insert(UInt8(x & 0xFF), at: 0)
            x = x >> 8
        }   

        if bytes.isEmpty {
            bytes = [0x00]
        }
        if (bytes[0] & 0x80) != 0 {
            bytes.insert(0x00, at: 0)
        }
        v.append(contentsOf: bytes)
        return derTLV(tag: 0x02, value: v)
    }

    func derOctetString(_ data: Data) -> Data {
        return derTLV(tag: 0x04, value: data)
    }

    func derOid(_ arcs: [UInt64]) -> Data {
        precondition(arcs.count >= 2)
        var out = Data()
        let firstByte = UInt8(arcs[0] * 40 + arcs[1])
        out.append(firstByte)

        for arc in arcs.dropFirst(2) {
            var arcValue = arc
            var arcBytes: [UInt8] = []
            arcBytes.append(UInt8(arcValue & 0x7F))
            arcValue = arcValue >> 7
            while arcValue > 0 {
                arcBytes.insert(UInt8((arcValue & 0x7F) | 0x80), at: 0)
                arcValue = arcValue >> 7
            }
            for byte in arcBytes.reversed() {
                out.append(byte)
            }
        }

        return derTLV(tag: 0x06, value: out)
    }

    func derContex0(_ data: Data) -> Data {
        return derTLV(tag: 0xA0, value: data)
    }

    func derContex1(_ data: Data) -> Data {
        return derTLV(tag: 0xA1, value: data)
    }

    func ecSpkiFromx963PublicKey(
        _ x963PublicKey: Data,
        namedCurve: String
    ) throws -> Data {
        let algId = derSequence([
            derOid(oid_ecPublicKey),
            derOid(try curveOid(namedCurve: namedCurve))
        ])

        return derSequence([
            algId,
            derOctetString(x963PublicKey)
        ])
    }

    func ecPkcs8FromPrivateScalar(
        _ privateScalar: Data,
        x963PublicKey: Data,
        namedCurve: String
    ) throws -> Data {
        let ecPriv = derSequence([
            derInteger(1),
            derOctetString(privateScalar),
            derContex0(derOid(try curveOid(namedCurve: namedCurve))),
            derContex1(derOctetString(x963PublicKey))
        ])

        let algId = derSequence([
            derOid(oid_ecPublicKey),
            derOid(try curveOid(namedCurve: namedCurve))
        ])

        return derSequence([
            derInteger(0),
            algId,
            derOctetString(ecPriv)
        ])
    }

    struct DERReader {
        let data: Data
        var offset: Int = 0

        mutating func readByte() throws -> UInt8 {
            guard offset < data.count else {
                throw NSError(domain: "WebCryptoNativeBridgeModule", code: 20, userInfo: [NSLocalizedDescriptionKey: "DER read out of bounds"])
            }
            let byte = data[offset]
            offset += 1
            return byte
        }

        mutating func readLength() throws -> Int {
            let firstByte = try readByte()
            if(firstByte < 0x80) {
                return Int(firstByte)
            } else {
                let numBytes = Int(firstByte & 0x7F)
                if numBytes == 0 || numBytes > 4 {
                    throw NSError(domain: "WebCryptoNativeBridgeModule", code: 21, userInfo: [NSLocalizedDescriptionKey: "Invalid DER length"])
                }
                var length = 0
                for _ in 0..<numBytes {
                    let byte = try readByte()
                    length = (length << 8) | Int(byte)
                }
                return length
            }
        }

        mutating func readTLV(expectedTag: UInt8? = nil) throws -> (UInt8 , Data) {
            let tag = try readByte()
            if let expectedT = expectedTag, tag != expectedT {
                throw NSError(domain: "WebCryptoNativeBridgeModule", code: 22, userInfo: [NSLocalizedDescriptionKey: "Unexpected DER tag: \(tag), expected: \(expectedT)"])
            }
            let length = try readLength()
            guard offset + length <= data.count else {
                throw NSError(domain: "WebCryptoNativeBridgeModule", code: 23, userInfo: [NSLocalizedDescriptionKey: "DER length out of bounds"])
            }
            let value = data.subdata(in: offset..<(offset + length))
            offset += length
            return (tag, value)
        }

        mutating func readSequence() throws -> DERReader {
            let (_, value) = try readTLV(expectedTag: 0x30)
            return DERReader(data: value, offset: 0)
        }

        mutating func readOid() throws -> [UInt64] {
            let (_, value) = try readTLV(expectedTag: 0x06)
            guard value.count >= 1 else {
                throw NSError(domain: "WebCryptoNativeBridgeModule", code: 24, userInfo: [NSLocalizedDescriptionKey: "Invalid OID encoding"])
            }
            var arcs: [UInt64] = []
            let firstByte = value[0]
            arcs.append(UInt64(firstByte / 40))
            arcs.append(UInt64(firstByte % 40))
            var index = 1
            while index < value.count {
                var arc: UInt64 = 0
                while true {    
                    guard index < value.count else {
                        throw NSError(domain: "WebCryptoNativeBridgeModule", code: 25, userInfo: [NSLocalizedDescriptionKey: "Invalid OID encoding"])
                    }
                    let byte = value[index]
                    index += 1
                    arc = (arc << 7) | UInt64(byte & 0x7F)
                    if (byte & 0x80) == 0 {
                        break
                    }
                }
                arcs.append(arc)
            }
            return arcs
        }

        mutating func readOctetString() throws -> Data {
            let (_, value) = try readTLV(expectedTag: 0x04)
            return value
        }

        mutating func readBitStringBytes() throws -> Data {
            let (_, value) = try readTLV(expectedTag: 0x03)
            guard value.count >= 1 else {
                throw NSError(domain: "WebCryptoNativeBridgeModule", code: 26, userInfo: [NSLocalizedDescriptionKey: "Invalid BIT STRING encoding"])
            }
            return value.dropFirst()
        }

        mutating func readInteger() throws -> Int {
            let (_, value) = try readTLV(expectedTag: 0x02)
            var result = 0
            for byte in value {
                result = (result << 8) | Int(byte)
            }
            return result
        }

        mutating func readContext(tag: UInt8) throws -> DERReader {
            let (_, value) = try readTLV(expectedTag: tag)
            return DERReader(data: value, offset: 0)
        }

        func err(msg: String) -> NSError {
            return NSError(domain: "WebCryptoNativeBridgeModule", code: 99, userInfo: [NSLocalizedDescriptionKey: msg])
        }
    }

    func parseEcSpki(
        _ spkiData: Data
    ) throws -> (namedCurve: String, x963PublicKey: Data) {
        var reader = DERReader(data: spkiData)
        var topSeq = try reader.readSequence()

        var algIdSeq = try topSeq.readSequence()
        let algOid = try algIdSeq.readOid()
        guard algOid == oid_ecPublicKey else {
            throw NSError(domain: "WebCryptoNativeBridgeModule", code: 20, userInfo: [NSLocalizedDescriptionKey: "SPKI is not EC"])
        }
        let curveOid = try algIdSeq.readOid()
        let namedCurve = try self.namedCurve(fromOid: curveOid)

        let x963PublicKey = try topSeq.readBitStringBytes()
        return (namedCurve, x963PublicKey)
    }

    func parseEcPkcs8(
        _ pkcs8Data: Data
    ) throws -> (namedCurve: String, data: Data) {
        var reader = DERReader(data: pkcs8Data)
        var topSeq = try reader.readSequence()

        let version = try topSeq.readInteger()
        guard version == 0 else {
            throw NSError(domain: "WebCryptoNativeBridgeModule", code: 30, userInfo: [NSLocalizedDescriptionKey: "Unsupported PKCS#8 version: \(version)"])
        }

        var alg = try topSeq.readSequence()
        let algOid = try alg.readOid()
        guard algOid == oid_ecPublicKey else {
            throw NSError(domain: "WebCryptoNativeBridgeModule", code: 21, userInfo: [NSLocalizedDescriptionKey: "PKCS#8 is not EC"])
        }
        let curveOid = try alg.readOid()
        let namedCurve = try self.namedCurve(fromOid: curveOid)

        let privOctetString = try topSeq.readOctetString()
        var privReader = DERReader(data: privOctetString)
        var privSeq = try privReader.readSequence()

        let privVersion = try privSeq.readInteger()
        guard privVersion == 1 else {
            throw NSError(domain: "WebCryptoNativeBridgeModule", code: 32, userInfo: [NSLocalizedDescriptionKey: "Unsupported EC private key version: \(privVersion)"])
        }

        let privateKeyData = try privSeq.readOctetString()
        return (namedCurve, privateKeyData)
    }

    func sha1(_ data: Data) throws -> Data {
        var digest = [UInt8](repeating: 0, count: Int(CC_SHA1_DIGEST_LENGTH))
        data.withUnsafeBytes { buf in
            _ = CC_SHA1(buf.baseAddress, CC_LONG(data.count), &digest)
        }
        return Data(digest)
    }
    
}