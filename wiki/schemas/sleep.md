---
type: schema
record_type: sleep
label: Sleep
created_at: '2026-04-15 16:29:19'
updated_at: '2026-04-15 16:29:19'
---

# Sleep

Sleep duration and quality records.

## Fields

| Field | Type | Required |
| --- | --- | --- |
| duration_hours | number | yes |
| quality | string | no |
| deep_sleep_pct | number | no |
| recorded_at | string | yes |
| device | string | no |


## Example

```json
{
  "duration_hours": 7.4,
  "quality": "good",
  "deep_sleep_pct": 18,
  "recorded_at": "2026-04-14T06:00:00Z",
  "device": "Oura Ring"
}
```
