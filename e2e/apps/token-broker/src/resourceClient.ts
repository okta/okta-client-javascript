import { FetchClient } from '@okta/spa-platform/fetch';
import { HostOrchestrator } from '@okta/spa-platform/orchestrator';
import { customScopes } from '@/auth';


const orchestrator = new HostOrchestrator.SubApp('AdminSpaBroker', { scopes: customScopes, targetOrigin: 'http://localhost:8080' });

export const fetchClient = new FetchClient(orchestrator);
