import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Credential } from '@okta/spa-platform';
import { Token, TokenJSON, isOAuth2ErrorResponse } from '@okta/auth-foundation'
import { Token as TokenComponent } from '@/component/Token';

let includeProfile = false;

export function Downscope () {
  const { credential } = useOutletContext() as { credential: Credential };
  const [downscoped, setDownscoped] =  useState<Credential | null>(null);

  const requestDownscopeToken = () => {
    const scopes = ['openid'];
    if (includeProfile) {
      scopes.push('profile');
    }
    includeProfile = !includeProfile;
    credential.oauth2.refresh(credential.token, scopes)
    .then(response => {
      if (isOAuth2ErrorResponse(response)) {
        return;
      }

      setDownscoped({ token: response } as Credential);
    });
  };

  return (
    <main>
      <hr />
      <button onClick={requestDownscopeToken} data-e2e="downscopeBtn">Request Downscope Token</button>
      {downscoped && (
        <TokenComponent credential={downscoped} />
      )}
    </main>
  );
}
