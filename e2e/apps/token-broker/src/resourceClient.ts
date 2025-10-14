import { FetchClient } from '@okta/spa-platform/fetch';
import { HostOrchestrator } from '@okta/spa-platform/orchestrator';
import { customScopes } from '@/auth';


const orchestrator = new HostOrchestrator.SubApp('AdminSpaBroker', { scopes: customScopes, targetOrigin: 'http://localhost:8080' });

// TODO: adjust this somehow???
orchestrator.defaultTimeout = 15000;

export const fetchClient = new FetchClient(orchestrator);

// testing APIClient request interceptors
const interceptor1 = (req: Request) => {
  req.headers.append('foo', '1');
  return req;
};
const interceptor2 = (req: Request) => {
  req.headers.append('bar', '1');
  return req;
};
fetchClient.addInterceptor(interceptor1);
fetchClient.addInterceptor(interceptor2);
fetchClient.removeInterceptor(interceptor2);
