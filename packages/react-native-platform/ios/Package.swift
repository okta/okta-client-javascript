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
            dependencies: [],
            exclude: ["BrowserSessionBridge.m", "BrowserSessionBridge.h"]
        ),
        .target(
            name: "RNTokenStorageBridge",
            dependencies: [],
            exclude: ["TokenStorageBridge.swift", "TokenStorageBridge.m", "TokenStorageBridge.h"]
        ),
        .testTarget(
            name: "RNTokenStorageBridgeTests",
            dependencies: ["RNTokenStorageBridge"]
        )
    ]
)



