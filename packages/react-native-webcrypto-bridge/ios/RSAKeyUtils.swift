import Foundation

// MARK: - RSA Public Key Components

/// Parsed components of an RSA public key, suitable for JWK serialization.
struct RSAPublicKeyComponents {
    /// The RSA modulus (`n`), with any ASN.1 leading-zero padding stripped.
    let modulus: Data

    /// The RSA public exponent (`e`), with any ASN.1 leading-zero padding stripped.
    let exponent: Data

    /// Parse components from a PKCS#1 `RSAPublicKey` DER structure:
    /// ```
    /// SEQUENCE {
    ///   INTEGER modulus
    ///   INTEGER exponent
    /// }
    /// ```
    ///
    /// - Parameter derData: The raw bytes returned by `SecKeyCopyExternalRepresentation`
    ///   for an RSA public key.
    /// - Returns: `nil` if the data is not a valid PKCS#1 structure.
    init?(derData: Data) {
        let bytes = [UInt8](derData)
        var offset = 0

        // Expect SEQUENCE tag (0x30)
        guard offset < bytes.count, bytes[offset] == 0x30 else { return nil }
        offset += 1

        // Skip SEQUENCE length
        guard RSAKeyUtils.readDERLength(bytes: bytes, offset: &offset) != nil else { return nil }

        // Read first INTEGER (modulus)
        guard offset < bytes.count, bytes[offset] == 0x02 else { return nil }
        offset += 1
        guard let modulusLength = RSAKeyUtils.readDERLength(bytes: bytes, offset: &offset) else { return nil }
        guard offset + modulusLength <= bytes.count else { return nil }

        var modulusBytes = Array(bytes[offset..<(offset + modulusLength)])
        offset += modulusLength

        // Strip leading zero byte used for ASN.1 sign encoding
        if modulusBytes.first == 0x00 && modulusBytes.count > 1 {
            modulusBytes.removeFirst()
        }

        // Read second INTEGER (exponent)
        guard offset < bytes.count, bytes[offset] == 0x02 else { return nil }
        offset += 1
        guard let exponentLength = RSAKeyUtils.readDERLength(bytes: bytes, offset: &offset) else { return nil }
        guard offset + exponentLength <= bytes.count else { return nil }

        var exponentBytes = Array(bytes[offset..<(offset + exponentLength)])

        // Strip leading zero byte used for ASN.1 sign encoding
        if exponentBytes.first == 0x00 && exponentBytes.count > 1 {
            exponentBytes.removeFirst()
        }

        self.modulus = Data(modulusBytes)
        self.exponent = Data(exponentBytes)
    }

    /// Create components directly from raw modulus and exponent data.
    init(modulus: Data, exponent: Data) {
        self.modulus = modulus
        self.exponent = exponent
    }

    // MARK: - DER Serialization

    /// Construct a PKCS#1 `RSAPublicKey` DER structure from this key's components.
    ///
    /// The resulting `Data` can be passed directly to `SecKeyCreateWithData` with
    /// `kSecAttrKeyTypeRSA` / `kSecAttrKeyClassPublic` attributes.
    var derData: Data {
        var modulusBytes = [UInt8](modulus)
        let exponentBytes = [UInt8](exponent)

        // Ensure modulus has a leading 0x00 if MSB is set (ASN.1 sign bit)
        if let first = modulusBytes.first, first & 0x80 != 0 {
            modulusBytes.insert(0x00, at: 0)
        }

        let modulusLengthOctets = RSAKeyUtils.encodeDERLength(modulusBytes.count)
        let exponentLengthOctets = RSAKeyUtils.encodeDERLength(exponentBytes.count)

        // +1 per INTEGER accounts for the tag byte (0x02)
        let contentLength = 1 + modulusLengthOctets.count + modulusBytes.count
                          + 1 + exponentLengthOctets.count + exponentBytes.count
        let sequenceLengthOctets = RSAKeyUtils.encodeDERLength(contentLength)

        var result = Data()
        result.reserveCapacity(1 + sequenceLengthOctets.count + contentLength)

        // SEQUENCE tag and length
        result.append(0x30)
        result.append(contentsOf: sequenceLengthOctets)

        // INTEGER tag, length, and modulus
        result.append(0x02)
        result.append(contentsOf: modulusLengthOctets)
        result.append(contentsOf: modulusBytes)

        // INTEGER tag, length, and exponent
        result.append(0x02)
        result.append(contentsOf: exponentLengthOctets)
        result.append(contentsOf: exponentBytes)

        return result
    }

    /// The key size in bits, derived from the modulus length.
    var keySizeInBits: Int {
        modulus.count * 8
    }
}

// MARK: - RSA Key Utilities

/// Pure-Swift utilities for converting between PKCS#1 DER-encoded RSA public keys
/// and their individual components (modulus + exponent).
///
/// Apple's Security framework (`SecKeyCopyExternalRepresentation` / `SecKeyCreateWithData`)
/// operates on raw PKCS#1 DER blobs but provides no API to extract or inject individual
/// components. These utilities bridge that gap for JWK ↔ SecKey conversion.
enum RSAKeyUtils {

    // MARK: - DER Length Encoding/Decoding

    /// Read a DER length field from a byte array, advancing `offset` past the length bytes.
    ///
    /// Supports both short-form (single byte < 128) and long-form lengths.
    /// Returns `nil` for invalid or indefinite-length encodings.
    static func readDERLength(bytes: [UInt8], offset: inout Int) -> Int? {
        guard offset < bytes.count else { return nil }
        let first = bytes[offset]
        offset += 1

        if first < 0x80 {
            // Short form: length is the byte value itself
            return Int(first)
        } else if first == 0x80 {
            // Indefinite length — not valid for DER
            return nil
        } else {
            // Long form: lower 7 bits indicate number of subsequent length bytes
            let numLengthBytes = Int(first & 0x7F)
            guard offset + numLengthBytes <= bytes.count else { return nil }

            var length = 0
            for i in 0..<numLengthBytes {
                length = (length << 8) | Int(bytes[offset + i])
            }
            offset += numLengthBytes
            return length
        }
    }

    /// Encode an integer as a DER length field.
    ///
    /// - Parameter length: The length value to encode (must be non-negative).
    /// - Returns: The DER-encoded length bytes.
    static func encodeDERLength(_ length: Int) -> [UInt8] {
        if length < 128 {
            return [UInt8(length)]
        }

        // Determine how many bytes are needed to represent `length`
        let byteCount = (length / 256) + 1
        var remaining = length
        var result: [UInt8] = [UInt8(byteCount + 0x80)]

        for _ in 0..<byteCount {
            result.insert(UInt8(remaining & 0xFF), at: 1)
            remaining = remaining >> 8
        }

        return result
    }
}
