import XCTest
@testable import RNWebCryptoBridge
import Foundation

class RSAKeyUtilsTests: XCTestCase {

    func testRSAPublicKeyComponents_initWithValidDER() {
        // Create test components and verify DER roundtrip
        let testModulus = Data("12345678901234567890".utf8)
        let testExponent = Data("65537".utf8)
        let components = RSAPublicKeyComponents(modulus: testModulus, exponent: testExponent)

        let derData = components.derData
        let parsedComponents = RSAPublicKeyComponents(derData: derData)

        XCTAssertNotNil(parsedComponents)
        XCTAssertEqual(parsedComponents?.modulus, testModulus)
        XCTAssertEqual(parsedComponents?.exponent, testExponent)
    }

    func testRSAPublicKeyComponents_keySizeInBits() {
        let modulus = Data(repeating: 0xFF, count: 256) // 2048 bits
        let exponent = Data([0x01, 0x00, 0x01]) // 65537
        let components = RSAPublicKeyComponents(modulus: modulus, exponent: exponent)

        XCTAssertEqual(components.keySizeInBits, 2048)
    }

    func testReadDERLength_shortForm() {
        let bytes: [UInt8] = [0x7F] // Short form: 127 bytes
        var offset = 0

        let length = RSAKeyUtils.readDERLength(bytes: bytes, offset: &offset)

        XCTAssertEqual(length, 127)
        XCTAssertEqual(offset, 1)
    }

    func testReadDERLength_longForm() {
        let bytes: [UInt8] = [0x81, 0xFF] // Long form: 255 bytes
        var offset = 0

        let length = RSAKeyUtils.readDERLength(bytes: bytes, offset: &offset)

        XCTAssertEqual(length, 255)
        XCTAssertEqual(offset, 2)
    }

    func testEncodeDERLength_shortForm() {
        let encoded = RSAKeyUtils.encodeDERLength(127)
        XCTAssertEqual(encoded, [0x7F])
    }

    func testEncodeDERLength_longForm() {
        let encoded = RSAKeyUtils.encodeDERLength(255)
        XCTAssertEqual(encoded, [0x81, 0xFF])
    }

    func testEncodeDERLength_multiByteForm() {
        let encoded = RSAKeyUtils.encodeDERLength(256)
        XCTAssertEqual(encoded.first, 0x82) // 2 bytes needed
    }
}
