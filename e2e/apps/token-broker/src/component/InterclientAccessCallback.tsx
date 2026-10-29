import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { performInterclientHandoff, handleAuthorizationCodeFlowResponse } from '@/auth';
import { Loading } from './Loading.js';

interface FlowCallbackProps {
  loadingElement?: React.ReactElement,
  fallbackPath?: string
}

// prevents mutiple calls in strict mode
// https://react.dev/learn/you-might-not-need-an-effect#initializing-the-application
let flowResumed = false;

export const InterclientAccessCallback: React.FC<FlowCallbackProps> = ({
  loadingElement = (<Loading />),
  fallbackPath = '/'
}) => {
  const navigate = useNavigate();
  const [callbackError, setCallbackError] = useState<Error | null>(null);

  useEffect(() => {
    // prevents mutiple calls in strict mode
    if (!flowResumed) {
      flowResumed = true;

      // `.slice(1)` drops the leading `#` character so `URLSearchParams` can be leveraged to parse the hash value
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const params = new URLSearchParams(window.location.search);
      const interclientToken = hashParams.get('token') ?? params.get('token');

      if (interclientToken) {
        // bootstrap leg: hand off to the Authorization Server; this redirects and never resolves
        performInterclientHandoff(interclientToken, params.get('path') ?? undefined)
        .catch(err => {
          console.log(err, err.message);
          setCallbackError(err as unknown as Error);
        });
      }
      else {
        // completion leg: Authorization Server redirected back with `code`
        handleAuthorizationCodeFlowResponse()
        .then((path) => {
          navigate(path ?? '/', { replace: true });
        })
        .catch(err => {
          console.log(err, err.message);
          if (err?.code === 'MISSING_REDIRECT_PARAM') {
            navigate(fallbackPath);
            return;
          }
          setCallbackError(err as unknown as Error);
        });
      }
    }
  }, []);

  return loadingElement;
};
