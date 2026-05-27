// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "RNPlatformBridges",
    platforms: [
        .iOS(.v13)
    ],
    products: [
        .library(
            name: "RNTokenStorageBridge",
            targets: ["RNTokenStorageBridge"]
        )
    ],
    dependencies: [],
    targets: [
        .target(
            name: "RNTokenStorageBridge",
            path: "Sources/RNTokenStorageBridge",
            exclude: ["TokenStorageBridge.m", "TokenStorageBridge.h"],
            publicHeadersPath: "."
        ),
        .testTarget(
            name: "RNTokenStorageBridgeTests",
            dependencies: ["RNTokenStorageBridge"],
            path: "Tests/RNTokenStorageBridgeTests"
        )
    ]
)



