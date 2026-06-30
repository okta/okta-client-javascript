#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(BrowserSessionBridge, NSObject)

RCT_EXTERN_METHOD(openAuthSession:(NSString *)url
                  redirectScheme:(NSString *)redirectScheme
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
