import { FetchClient, HostOrchestrator, type APIRequest } from '@okta/spa-platform';
import { customScopes } from '@/auth';


const orchestrator = new HostOrchestrator.SubApp('AdminSpaBroker', { scopes: customScopes, targetOrigin: 'http://localhost:8080' });

// TODO: adjust this somehow???
orchestrator.defaultTimeout = 15000;

export const fetchClient = new FetchClient(orchestrator);

// testing APIClient request interceptors
const interceptor1 = (req: APIRequest) => {
  req.headers.append('foo', '1');
  return req;
};
const interceptor2 = (req: APIRequest) => {
  req.headers.append('bar', '1');
  return req;
};
fetchClient.addInterceptor(interceptor1);
fetchClient.addInterceptor(interceptor2);
fetchClient.removeInterceptor(interceptor2);
