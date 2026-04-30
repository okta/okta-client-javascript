[@okta/spa-platform](..) / Orchestrators

# Orchestrators

Browser-specific implementations of [TokenOrchestrator](/api/auth-foundation/TokenOrchestrator/).

| Orchestrator | Description |
| ------ | ------ |
| [AuthorizationCodeFlowOrchestrator](AuthorizationCodeFlowOrchestrator/index.md) | An implementation of [TokenOrchestrator](/api/auth-foundation/TokenOrchestrator/) leveraging [AuthorizationCodeFlow](../Flows/classes/AuthorizationCodeFlow.md) |
| [HostOrchestrator](HostOrchestrator/index.md) | Delegates token requests to a centralized broker. Ideal for enterprise-scale applications  |
