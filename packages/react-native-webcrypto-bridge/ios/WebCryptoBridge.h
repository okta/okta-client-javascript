#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <React/RCTEventEmitter.h>
#import "RNWebCryptoBridgeSpec.h"

@interface WebCryptoBridge : NSObject <NativeWebCryptoBridgeSpec>
#else
@interface WebCryptoBridge : NSObject <RCTBridgeModule>
#endif

@end