#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WebCryptoNativeBridge, NSObject)

RCT_EXTERN_METHOD(digest:(NSString *)algorithm
                  dataBase64:(NSString *)dataBase64
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(randomUUID:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(generateKey:(NSDictionary *)algorithm
                  extractable:(BOOL)extractable
                  keyUsages:(NSArray *)keyUsages
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(importKey:(NSString *)format
                  keyData:(NSString *)keyData
                  algorithm:(NSDictionary *)algorithm
                  extractable:(BOOL)extractable
                  keyUsages:(NSArray *)keyUsages
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(sign:(NSDictionary *)algorithm
                  key:(NSDictionary *)key
                  dataBase64:(NSString *)dataBase64
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)            

@end