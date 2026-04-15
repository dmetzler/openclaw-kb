---
type: schema
record_type: finance
label: Finance
created_at: '2026-04-15 11:29:13'
updated_at: '2026-04-15 11:29:13'
---

# Finance

Personal finance transactions and expenses.

## Fields

| Field | Type | Required |
| --- | --- | --- |
| category | string | yes |
| amount | number | yes |
| currency | string | yes |
| description | string | no |
| recorded_at | string | yes |


## Example

```json
{
  "category": "groceries",
  "amount": 84.35,
  "currency": "USD",
  "description": "Weekly grocery run",
  "recorded_at": "2026-04-13T18:45:00Z"
}
```
