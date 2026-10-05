# Faizan Body Project Guidelines & Rules

## 1. Zero Dummy Data Rule (Strict)
- **NEVER** insert, hardcode, or mock dummy/test data in frontend components, states, or services.
- All lists, cards, and views must display real data fetched from the backend API.
- Empty states must show clean "No data found / Add your first entry" placeholders rather than mock items.

## 2. Data Integrity & Safety (Strict)
- Respect backend data; ensure actions (add/edit) preserve existing fields without accidental overwrites or loss.
