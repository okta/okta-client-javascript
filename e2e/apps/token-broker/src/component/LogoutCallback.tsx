import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import { getSearchParam } from '@okta/auth-foundation';
import { Loading } from './Loading';


interface LogoutProps {
  loadingElement?: React.ReactElement,
  postLogoutRedirect?: string
}

// prevents mutiple calls in strict mode
// https://react.dev/learn/you-might-not-need-an-effect#initializing-the-application
let flowResumed = false;

export const LogoutCallback: React.FC<LogoutProps> = ({
  loadingElement = (<Loading />),
  postLogoutRedirect = '/'
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // prevents mutiple calls in strict mode
    if (!flowResumed) {
      flowResumed = true;

      // do something with state?
      const state = getSearchParam(searchParams, 'state');
      console.log('logout state: ', state);

      setSearchParams({});
      navigate(postLogoutRedirect, { replace: true });
    }
  }, [navigate, searchParams, setSearchParams]);

  return loadingElement;
};
