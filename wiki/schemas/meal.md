---
type: schema
record_type: meal
label: Meal
created_at: '2026-04-15 17:37:38'
updated_at: '2026-04-15 17:37:38'
---

# Meal

Meals and food intake records.

## Fields

| Field | Type | Required |
| --- | --- | --- |
| meal_type | string | yes |
| items | array | yes |
| calories_est | number | no |
| recorded_at | string | yes |


## Example

```json
{
  "meal_type": "lunch",
  "items": [
    "salad",
    "grilled chicken",
    "apple"
  ],
  "calories_est": 520,
  "recorded_at": "2026-04-14T12:15:00Z"
}
```
