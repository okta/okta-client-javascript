import { fetch as expoFetch, FetchResponse } from "expo/fetch";
import Constants from "expo-constants";
import OAuth2Client from "@okta/auth-foundation/client";

console.log("fetch: ", fetch);
console.log("Res.json", Response.json);

// console.log("RUNTIME extra.env=", Constants?.expoConfig?.extra?.env);
// console.log("RUNTIME process.env=", process.env);

export const client = new OAuth2Client(
  {
    baseURL: Constants?.expoConfig?.extra?.env.ISSUER,
    clientId: Constants?.expoConfig?.extra?.env.NATIVE_CLIENT_ID,
    // TODO: skip OIDC to avoid PK import errors
    // scopes: ['openid', 'email', 'profile', 'offline_access'],
    scopes: ["offline_access"],
    dpop: false,
  },
  {
    // fetchImpl: async (input: string | URL | Request, init?: RequestInit) => {
    //   // const { body, ...rest } = { body: undefined, ...init };
    //   // const request = input instanceof Request ? input : new Request(input, rest);
    //   const request = input instanceof Request ? input : new Request(input, init);
    //   // TODO: expand additional request options
    //   const { url, method, headers } = request;
    //   console.log('url', url);
    //   // console.log('body', request.body, init?.body)

    //   //console.log('typeof body', typeof body, typeof request.body);
    //   // const response = await expoFetch(url, { method, headers, body: body === null ? undefined: body });
    //   // const json = await response.json();
    //   // const { status, statusText } = response;
    //   // console.log(Response);
    //   // return Response.json(json, { status, statusText, headers: response.headers });

    //   const response = await expoFetch(url, { method, headers });
    //   console.log('typeof response', response instanceof Response);
    //   if (method.toLocaleUpperCase() === 'POST') {
    //     console.log('post request')
    //     const body = await response.json();
    //     console.log(body);
    //   }
    //   return response;

    //   // const request = input instanceof Request ? input : new Request(input, init);
    //   // if (request.body && request.body instanceof URLSearchParams) {
    //   //   request.body = request.body.toString();
    //   // }
    // },

    // NOTE: this isn't doing anything. The problem seems to be within `URLSearchParams`
    // passing it directly to `fetch` wasn't converting the body to the correct format.
    // directly calling `body: params.toString()` seems to be working fine for now
    // (Fix in oauth2-flows/AuthCodeFlow/prepare)

    fetchImpl: async (input: string | URL | Request, init?: RequestInit) => {
      // const { body, ...rest } = { body: undefined, ...init };
      // const request = input instanceof Request ? input : new Request(input, rest);
      const request =
        input instanceof Request ? input : new Request(input, init);
      console.log("request", request);
      console.log("url: ", request.url);
      console.log(
        "bdoy: ",
        typeof request.body,
        request.body instanceof URLSearchParams
      );
      console.log("body", request.body);
      // const { url, body, method, headers } = request;
      const response = await fetch(request);
      console.log(response.body);
      return response;
    },
  }
);
