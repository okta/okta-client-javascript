[@okta/spa-platform](../..) / [Orchestrators](../../index.md) / HostOrchestrator

# HostOrchestrator

Browser-specific orchestrator pattern which consists of 2 parts: a [Host](classes/HostOrchestrator.md)
and [SubApps](../../orchestrators/HostOrchestrator/classes/SubApp.md). The [Host](classes/HostOrchestrator.md) brokers tokens
on behalf of [SubApps](../../orchestrators/HostOrchestrator/classes/SubApp.md). [SubApps](../../orchestrators/HostOrchestrator/classes/SubApp.md)
defers all of its token requests to the [Host](classes/HostOrchestrator.md) rather than managing OAuth itself.

> [!NOTE]
> All events between `Host` and `SubApp`s are restricted to the specific tab

This orchestrator is aimed at enterprise web apps composed of multiple, independently-developed 
sub-apps (e.g. owned by different teams) - the teams building those sub-apps don't need to understand
OAuth or handle token management themselves; they just talk to the shared [Host](classes/HostOrchestrator.md).

```tsx
class MyHost extends HostOrchestrator.Host {
  // custom implementation
}

const host = new MyHost();

function App () {
  useEffect(() => {
    host.activate();
  }, []);

  return (
    <>
      <App1 />
      <App2 />
      <App3 />
    </>
  )
}
```

## Host

| Name | Description |
| ------ | ------ |
| [Host](classes/HostOrchestrator.md) | Receives and fulfills delegated [Token](/api/auth-foundation/Token/) requests from [SubApp](../../orchestrators/HostOrchestrator/classes/SubApp.md) instances |
| [HostOptions](type-aliases/HostOptions.md) | Options to change configurable behavior of [Host](classes/HostOrchestrator.md) |
| [HostEvents](type-aliases/HostEvents.md) | Map of events which can be emitted from [Host.emitter](classes/HostOrchestrator.md#emitter) |

## SubApp

| Name | Description |
| ------ | ------ |
| [SubApp](../../orchestrators/HostOrchestrator/classes/SubApp.md) | An implementation of [TokenOrchestrator](/api/auth-foundation/TokenOrchestrator/) which delegates all token retrieval to a centralized broker, rather than acquiring tokens itself |
| [SubAppOptions](type-aliases/SubAppOptions.md) | Options to change configurable behavior of [SubApp](../../orchestrators/HostOrchestrator/classes/SubApp.md) |
| [SubAppEvents](type-aliases/SubAppEvents.md) | Map of events which can be emitted from [SubApp.emitter](classes/HostOrchestrator.md#emitter) |

## ProxyHost

| Name | Description |
| ------ | ------ |
| [ProxyHost](classes/ProxyHost.md) | A utility class to adapt any [TokenOrchestrator](/api/auth-foundation/TokenOrchestrator/) instance into a [Host](classes/HostOrchestrator.md) |
