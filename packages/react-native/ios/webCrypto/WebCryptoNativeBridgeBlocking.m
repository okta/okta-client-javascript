#import <React/RCTBridgeModule.h>
#import <Security/Security.h>

@interface WebCryptoNativeBridge : NSObject
@end

@implementation WebCryptoNativeBridge (Random)

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getRandomValues:(nonnull NSNumber *)length)
{
  NSUInteger n = [length integerValue];
    if (n == 0 || n > 65536) {
      return nil;
    }

  NSMutableData *data = [NSMutableData dataWithLength:(NSUInteger)n];
  int status = SecRandomCopyBytes(kSecRandomDefault, (size_t)n, data.mutableBytes);
  if (status != errSecSuccess) {
    return nil;
  }
  
  return [data base64EncodedStringWithOptions:0];
}
@end