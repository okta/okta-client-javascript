// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "RNPlatformBridges",
    platforms: [
        .iOS(.v13)
    ],
    products: [
        .library(
            name: "RNBrowserSessionBridge",
            targets: ["RNBrowserSessionBridge"]
        ),
        .library(
            name: "RNTokenStorageBridge",
            targets: ["RNTokenStorageBridge"]
        )
    ],
    dependencies: [],
    targets: [
        .target(
            name: "RNBrowserSessionBridge",
            dependencies: []
        ),
        .target(
            name: "RNTokenStorageBridge",
            dependencies: []
        ),
        .testTarget(
            name: "RNTokenStorageBridgeTests",
            dependencies: ["RNTokenStorageBridge"]
        )
    ]
)



