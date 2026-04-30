#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import "RNWebCryptoBridge.h"

@interface WebCryptoBridge : NSObject <RCTBridgeModule, NativeWebCryptoBridgeSpec>
#else
@interface WebCryptoBridge : NSObject <RCTBridgeModule>
#endif

@end
