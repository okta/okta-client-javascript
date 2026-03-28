require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = "react-native-platform"
  s.version      = package['version']
  s.summary      = "Okta React Native Platform SDK"
  s.description  = package['description'] || "Okta authentication platform for React Native"
  s.homepage     = "https://github.com/okta/okta-client-javascript"
  s.license      = package['license']
  s.authors      = { "Okta" => "jared.perreault@okta.com" }
  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/okta/okta-client-javascript.git", :tag => "v#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  
  s.dependency "React-Core"
  
  # Enable Swift support
  s.swift_version = "5.0"
end