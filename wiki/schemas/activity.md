---
type: schema
record_type: activity
label: Activity
created_at: '2026-04-17 08:04:31'
updated_at: '2026-04-17 08:04:31'
---

# Activity

Exercise or movement activity records.

## Fields

| Field | Type | Required |
| --- | --- | --- |
| activity_type | string | yes |
| duration_minutes | number | yes |
| distance_km | number | no |
| calories | number | no |
| avg_hr | number | no |
| recorded_at | string | yes |


## Example

```json
{
  "activity_type": "running",
  "duration_minutes": 45,
  "distance_km": 8.2,
  "calories": 420,
  "avg_hr": 145,
  "recorded_at": "2026-04-14T07:30:00Z"
}
```
