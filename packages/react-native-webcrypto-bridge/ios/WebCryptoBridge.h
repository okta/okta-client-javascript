#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <React/RCTEventEmitter.h>
#import "RNWebCryptoBridge.h"

@interface WebCryptoBridge : NSObject <NativeRNWebCryptoBridgeSpec>
#else
@interface WebCryptoBridge : NSObject <RCTBridgeModule>
#endif

@end