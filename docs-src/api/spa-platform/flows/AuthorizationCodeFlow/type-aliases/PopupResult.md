[@okta/spa-platform](../../..) / [Flows](../../index.md) / [AuthorizationCodeFlow](../index.md) / PopupResult

# Type Alias: PopupResult

> **PopupResult** = [`Result`](Result.md) & `object` \| \{ `completed`: `false`; `reason`: `"closed"` \| `"blocked"`; \}

The possible results from [AuthorizationCodeFlow.PerformInPopup](../index.md#performinpopup)

Success response:
| Property | Type | Description |
| ------ | ------ | ------ |
| `completed` | `true` | Indicates the flow completed successfully |
| `token` | [Token](/api/auth-foundation/Token/) | The resulting token from the successful flow |
| `context` | `Record<string, any>` | Developer-provided (pre-auth) metadata about the token |

Unsuccessful response:
| Property | Type | Description |
| ------ | ------ | ------ |
| `completed` | `false` | Indicates the flow **did not** complete |
| `reason` | `'closed'` or `'blocked'` | Indicates the _reason_ the flow did not complete |

  - `'closed'` indicates the user manually closed the popup window
  - `'blocked'` indicates the popup window was unable to be opened (presumably by a popup blocker or browser heustistics)
