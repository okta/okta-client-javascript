require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32'

Pod::Spec.new do |s|
  s.name         = "react-native-webcrypto-bridge"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/okta/okta-client-javascript"
  s.license      = package["license"]
  s.platforms    = { :ios => "13.4" }
  s.source       = { :git => "https://github.com/okta/okta-client-javascript.git", :tag => "#{s.version}" }

  s.source_files = "ios/Sources/**/*.{h,m,mm,swift}"
  s.swift_version = "5.0"

  # New Architecture support
  if ENV['RCT_NEW_ARCH_ENABLED'] == '1'
    s.compiler_flags = folly_compiler_flags + " -DRCT_NEW_ARCH_ENABLED=1"
    s.pod_target_xcconfig = {
      'DEFINES_MODULE' => 'YES',
      'HEADER_SEARCH_PATHS' => [
        '"$(PODS_ROOT)/Headers/Private/React-Codegen/react/renderer/components"',
        '"$(PODS_TARGET_SRCROOT)/../../../ios/build/generated/ios"',
        '"${PODS_CONFIGURATION_BUILD_DIR}/React-Codegen/React_Codegen.framework/Headers"'
      ].join(' '),
      'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17'
    }
  else
    s.pod_target_xcconfig = {
      'DEFINES_MODULE' => 'YES'
    }
  end

  install_modules_dependencies(s)
end