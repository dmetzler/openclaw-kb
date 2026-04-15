---
type: schema
record_type: health_metric
label: Health Metric
created_at: '2026-04-15 11:26:17'
updated_at: '2026-04-15 11:26:17'
---

# Health Metric

Health measurements such as weight, heart rate, or blood pressure.

## Fields

| Field | Type | Required |
| --- | --- | --- |
| metric_type | string | yes |
| value | number | yes |
| unit | string | yes |
| recorded_at | string | yes |
| device | string | no |


## Example

```json
{
  "metric_type": "heart_rate",
  "value": 72,
  "unit": "bpm",
  "recorded_at": "2026-04-14T10:00:00Z",
  "device": "Fitbit Sense"
}
```
