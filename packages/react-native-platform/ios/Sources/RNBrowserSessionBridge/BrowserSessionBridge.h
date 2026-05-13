#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import "RNTokenStorageBridge.h"

@interface BrowserSessionBridge : NSObject <RCTBridgeModule, Native_ImaginaryBrowserSessionBridgeSpec>
#else
@interface BrowserSessionBridge : NSObject <RCTBridgeModule>
#endif

@end
