import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { handleAuthorizationCodeFlowResponse } from '@/auth';
import { Loading } from './Loading';

interface FlowCallbackProps {
  loadingElement?: React.ReactElement
}

// prevents mutiple calls in strict mode
// https://react.dev/learn/you-might-not-need-an-effect#initializing-the-application
let flowResumed = false;

export const LoginCallback: React.FC<FlowCallbackProps> = ({ loadingElement = (<Loading />) }) => {
  const navigate = useNavigate();
  const [callbackError, setCallbackError] = useState<Error | null>(null);

  useEffect(() => {
    // prevents mutiple calls in strict mode
    if (!flowResumed) {
      handleAuthorizationCodeFlowResponse()
      .then((originalUri) => {
        navigate(originalUri ?? '/', { replace: true });
      })
      .catch(err => {
        console.log(err, err.message);
        setCallbackError(err as unknown as Error);
      });

      flowResumed = true;
    }
  }, []);

  return loadingElement;
};
