#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WebCryptoBridge, NSObject)

RCT_EXTERN_METHOD(digest:(NSString *)algorithm
                  data:(NSString *)data
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(generateKey:(NSString *)algorithm
                  extractable:(BOOL)extractable
                  keyUsages:(NSArray *)keyUsages
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(exportKey:(NSString *)format
                  keyId:(NSString *)keyId
                  keyType:(NSString *)keyType
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(importKey:(NSString *)format
                  keyData:(NSString *)keyData
                  algorithm:(NSString *)algorithm
                  extractable:(BOOL)extractable
                  keyUsages:(NSArray *)keyUsages
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(sign:(NSString *)algorithm
                  keyId:(NSString *)keyId
                  data:(NSString *)data
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(verify:(NSString *)algorithm
                  keyId:(NSString *)keyId
                  signature:(NSString *)signature
                  data:(NSString *)data
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getRandomValues:(double)length)

RCT_EXTERN_METHOD(randomUUID)

@end
