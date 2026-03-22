require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-webcrypto-bridge"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/okta/okta-client-javascript"
  s.license      = package["license"]
  s.authors      = { "Okta" => "jared.perreault@okta.com" }
  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/okta/okta-client-javascript.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.swift_version = "5.0"

  # This tells CocoaPods to look for the Codegen output
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  install_modules_dependencies(s)
end