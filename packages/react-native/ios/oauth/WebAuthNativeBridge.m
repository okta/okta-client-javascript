#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WebAuthNativeBridge, NSObject)

RCT_EXTERN_METHOD(openAuthSessionAsync:(NSString *)authorizationUrl 
                redirectUri:(NSString *)redirectUri
                preferEphemeral:(BOOL)preferEphemeral
                resolver:(RCTPromiseResolveBlock)resolve 
                rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL) requiresMainQueueSetup
{
    return YES;
}
@end