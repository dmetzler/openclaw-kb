---
type: schema
record_type: grade
label: Grade
created_at: '2026-04-15 17:37:38'
updated_at: '2026-04-15 17:37:38'
---

# Grade

Academic grades and performance scores.

## Fields

| Field | Type | Required |
| --- | --- | --- |
| student | string | yes |
| subject | string | yes |
| score | number | yes |
| max_score | number | yes |
| coefficient | number | no |
| trimester | string | no |
| school_year | string | yes |
| recorded_at | string | yes |


## Example

```json
{
  "student": "Ava Martin",
  "subject": "Mathematics",
  "score": 17.5,
  "max_score": 20,
  "coefficient": 2,
  "trimester": "T2",
  "school_year": "2025-2026",
  "recorded_at": "2026-02-15T00:00:00Z"
}
```
