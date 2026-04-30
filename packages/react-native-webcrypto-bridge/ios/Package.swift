// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "RNWebCryptoBridge",
    platforms: [
        .iOS(.v13)
    ],
    products: [
        .library(
            name: "RNWebCryptoBridge",
            targets: ["RNWebCryptoBridge"]
        )
    ],
    targets: [
        .target(
            name: "RNWebCryptoBridge",
            path: "Sources/RNWebCryptoBridge",
            exclude: ["WebCryptoBridgeModule.m", "WebCryptoBridge.swift", "WebCryptoBridge.h"],
            publicHeadersPath: "."
        ),
        .testTarget(
            name: "RNWebCryptoBridgeTests",
            dependencies: ["RNWebCryptoBridge"],
            path: "Tests/RNWebCryptoBridgeTests"
        )
    ]
)

