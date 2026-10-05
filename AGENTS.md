# Faizan Body Project Guidelines & Rules

## 1. Zero Dummy Data Rule (Strict)
- **NEVER** insert, hardcode, or mock dummy/test data in frontend components, states, or services.
- All lists, cards, and views must display real data fetched from the backend API.
- Empty states must show clean "No data found / Add your first entry" placeholders rather than mock items.

## 2. Data Integrity & Safety (Strict)
- Respect backend data; ensure actions (add/edit) preserve existing fields without accidental overwrites or loss.

## 3. 100% Design Consistency & Unified UI Patterns (Strict)
- **Unified Modals & Popups:**
  - All confirmation and delete popups across the entire app MUST use the exact same luxury Android dialog design:
    - Container: `modal-backdrop` -> `android-dialog luxury-dialog`
    - Top Icon Badge: `dialog-icon-wrapper delete-dialog-icon`
    - Title: `dialog-title`
    - Description: `dialog-message`
    - Actions: `dialog-actions` with `btn btn-secondary` (Cancel) and `btn btn-danger` (Action).
- **Unified Empty States:**
  - All empty states across all pages (Workers, Orders, etc.) MUST use the exact same luxury empty pattern:
    - Container: `empty-workers-state` (dashed luxury card with subtle shadow)
    - Graphic: `empty-luxury-illustration` with branded SVG
    - Content: `<h3>`, `<p>`, and `btn btn-primary btn-empty-cta` button.
- **Strict Button Tokens:**
  - Always use predefined button classes: `btn btn-primary`, `btn btn-secondary`, `btn btn-danger`.
  - NEVER invent one-off classes like `btn-primary-luxury` that lack CSS definitions.

