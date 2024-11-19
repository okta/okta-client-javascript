/*!
 * Copyright (c) 2015-present, Okta, Inc. and/or its affiliates. All rights reserved.
 * The Okta software accompanied by this notice is provided pursuant to the Apache License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and limitations under the License.
 */


export const DEFAULT_MAX_CLOCK_SKEW = 300;
export const TOKEN_STORAGE_NAME = 'okta-token-storage';
export const ACCESS_TOKEN_STORAGE_KEY = 'accessToken';
export const ID_TOKEN_STORAGE_KEY =  'idToken';
export const REFRESH_TOKEN_STORAGE_KEY =  'refreshToken';
export const REFERRER_PATH_STORAGE_KEY = 'referrerPath';

export const EVENT_EXPIRED = 'credential_expired';
export const EVENT_REFRESHED = 'credential_refreshed';
export const EVENT_ADDED = 'credential_added';
export const EVENT_UPDATED = 'credential_updated';
export const EVENT_REMOVED = 'credential_removed';
export const EVENT_CLEARED = 'cleared';
export const EVENT_DEFAULT_CHANGED = 'default_changed';
export const EVENT_ERROR = 'error';
export const EVENT_SET_STORAGE = 'set_storage';
