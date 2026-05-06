#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import "RNTokenStorageBridge.h"

@interface TokenStorageBridge : NSObject <RCTBridgeModule, NativeTokenStorageBridgeSpec>
#else
@interface TokenStorageBridge : NSObject <RCTBridgeModule>
#endif

@end
