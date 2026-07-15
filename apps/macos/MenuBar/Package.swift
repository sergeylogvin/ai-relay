// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "AIRelayMenuBar",
    platforms: [
        .macOS(.v13)
    ],
    targets: [
        .executableTarget(
            name: "AIRelayMenuBar"
        )
    ]
)
