require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
    s.name         = "okta-react-native"
    s.version      = package["version"]
    s.summary      = package["description"] || "WebCrypto and Secure Storage helper for React Native"
    s.license      = package["license"] || "MIT"
    s.authors      = package["author"] || "Okta"
    s.homepage     = "https://github.com/okta/okta-client-javascript"
    s.source       = { :git => "https://github.com/okta/okta-client-javascript.git", :tag => s.version.to_s } 

    s.platforms    = { :ios => "13.0" }
    s.source_files = "ios/**/*.{h,m,mm,swift}"
    s.requires_arc = true

    s.dependency "React-Core"
    s.swift_version = "5.0"

end