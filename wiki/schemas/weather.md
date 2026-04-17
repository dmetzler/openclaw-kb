---
type: schema
record_type: weather
label: Weather
created_at: '2026-04-15 17:37:36'
updated_at: '2026-04-15 17:37:36'
---

# Weather

Weather readings

## Fields

| Field | Type | Required |
| --- | --- | --- |
| temperature_c | number | yes |
| recorded_at | string | yes |


## Example

```json
{
  "temperature_c": 21.3,
  "recorded_at": "2026-04-14T09:00:00Z"
}
```
