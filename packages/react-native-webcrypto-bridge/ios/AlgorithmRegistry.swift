import Foundation

/// Singleton registry for managing cryptographic algorithm handlers.
/// Maps algorithm names to their corresponding CryptoAlgorithmHandler implementations.
/// Provides thread-safe lookup methods for dispatching algorithm-specific operations.
class AlgorithmRegistry {
    static let shared = AlgorithmRegistry()

    private var handlers: [String: CryptoAlgorithmHandler] = [:]
    private let lock = NSLock()

    /// Initializes the registry with built-in algorithm handlers.
    private init() {
        // Register RSA handler
        handlers["RSASSA-PKCS1-v1_5"] = RSAHandler()

        // Future algorithm registrations:
        // handlers["ECDSA"] = ECDSAHandler()
        // handlers["EdDSA"] = EdDSAHandler()
    }

    /// Retrieves the handler for a specific algorithm name.
    /// Thread-safe access with NSLock.
    ///
    /// @param algorithmName The algorithm name to look up (e.g., "RSASSA-PKCS1-v1_5")
    /// @return CryptoAlgorithmHandler if registered, nil otherwise
    func getHandler(for algorithmName: String) -> CryptoAlgorithmHandler? {
        lock.lock()
        defer { lock.unlock() }
        return handlers[algorithmName]
    }

    /// Retrieves the handler for a JWK key type.
    /// Maps JWK "kty" field to algorithm name and looks up handler.
    /// Thread-safe access with NSLock.
    ///
    /// @param kty The JWK key type field (e.g., "RSA", "EC", "OKP")
    /// @return CryptoAlgorithmHandler if key type is mapped, nil otherwise
    func getHandlerByKeyType(_ kty: String) -> CryptoAlgorithmHandler? {
        lock.lock()
        defer { lock.unlock() }

        let algorithmName = keyTypeToAlgorithm(kty)
        return algorithmName.flatMap { handlers[$0] }
    }

    /// Maps JWK key type to algorithm name.
    /// @param kty The JWK key type ("RSA", "EC", "OKP")
    /// @return Algorithm name or nil if not recognized
    private func keyTypeToAlgorithm(_ kty: String) -> String? {
        switch kty {
        case "RSA": return "RSASSA-PKCS1-v1_5"
        case "EC": return "ECDSA"
        case "OKP": return "EdDSA"
        default: return nil
        }
    }
}
