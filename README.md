# ManiLogix UI — implementation and flow plan

Status: repository created; planning complete; implementation phases pending. Backend source of truth: [ManiLogix modulith](https://github.com/rehman4113/Mani-Logix-B2B/tree/main/Coding/manilogix-modulith) (reviewed at commit `468731405e523d5b3e1197f89039e8f0e1665b5c`). Implement on a `dev` branch; keep `main` for later approval and production.

## Product and visual direction

A credible B2B supply chain workspace: charcoal sidebar, warm ivory workspace, navy/near-black type, restrained orange (`#E98A45`) for emphasis, muted green for success and clear semantic warning/error colors. Wide readable tables, purposeful whitespace, compact filters, crisp cards, clean typography and subtle 120–220 ms hover/panel transitions. No motion that delays work; respect reduced-motion. Light/dark toggle persists preference. Responsive sidebar becomes a drawer on small screens; tables retain usable search/filter and details.

### Typography, layout and motion reference

Carry over the professional editorial feel approved for the portfolio: expressive, confident display typography for page titles and feature headlines; a restrained, highly legible sans serif for controls, tables, forms and dense operational data. Use a consistent type scale, strong weight and spacing contrast, and short descriptive headings. Do not use oversized decorative lettering inside data tables or transactional forms. Establish the actual font family and licensed source during Phase 1; prefer performant, self-hosted variable fonts with sensible system fallbacks.

Borrow the portfolio's layout discipline and motion language: intentional asymmetric composition on welcome/demo sections, generous whitespace around major headings, precise grid alignment in the dashboard, subtle section reveals and responsive hover feedback. Keep data-heavy screens predictable and scannable. Use transforms/opacity for animation, avoid layout shifts and heavy scroll effects, and turn nonessential animation off for reduced-motion users. Preserve ManiLogix's approved charcoal/ivory/orange palette in both light and dark themes; do not copy portfolio content, branding, imagery or project cards.

Framework: React + TypeScript + Vite, React Router, a lightweight server-data query layer, CSS variables/design tokens, accessible component primitives. Do not use Angular. One API adapter uses `VITE_API_BASE_URL` to call the existing Spring Modulith `/api/*` routes; no new backend or mock-only production screens. Never expose database credentials or server secrets in the browser.

## Real user journeys

1. Visitor opens landing/sign-in: can sign in, create a CUSTOMER account, or enter an explicitly labeled **Demo preview**. Demo uses local, fixed, read-only dummy data; it does not create an account or send writes. Demo actions that need an account explain why and link to sign-in. No Google login.
2. Customer signs up with email/password → sign-in → browse inventory → inspect item and supplier context available through the API → add items belonging to **one supplier** to cart → supply delivery address → review quantities, line prices and total → place order → see order detail and own notifications. Customer can cancel while PENDING or CONFIRMED.
3. Supplier signs in → sees owned inventory and owned order list → views own supplier profile → updates allowed profile and items → advances an owned order PENDING → CONFIRMED → SHIPPED → DELIVERED. No global supplier directory for supplier role.
4. Manager signs in → operations dashboard, all orders, active inventory and supplier directory; views supplier details and manages inventory/orders where permitted. No admin-only supplier creation or role provisioning.
5. Admin signs in → operations overview, suppliers, inventory, orders, notifications and user provisioning → creates SUPPLIER or MANAGER accounts → registers supplier profile with the supplier user's ID → reviews alerts and can deactivate suppliers/items as authorized.

For every journey, show loading, empty, permission-denied, validation, conflict and connectivity states. Refresh data after changes; prevent duplicate submits. Display role-specific navigation and enforce permissions visually, while treating the backend as the authority.

## Existing API contract map

| Area | Existing endpoint | UI behavior / constraints |
| --- | --- | --- |
| Auth | `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/users` | Signup is CUSTOMER only; login returns `accessToken` and `expiresInSeconds`; user provisioning is ADMIN only. No refresh/logout endpoint is present; logout discards local session. Recheck token expiration and do not invent refresh. |
| Suppliers | `GET /api/suppliers`, `GET /api/suppliers/{id}`, `POST /api/suppliers`, `PATCH /api/suppliers/{id}`, `DELETE /api/suppliers/{id}` | List is ADMIN/MANAGER; detail/update requires owner or staff; create/deactivate ADMIN. Input includes name, email, ownerUserId, contactNumber, address, company. |
| Inventory | `GET /api/inventory?page=0&size=20`, `GET /api/inventory/{id}`, `POST /api/inventory`, `PUT /api/inventory/{id}`, `DELETE /api/inventory/{id}` | List uses Spring Page `content`, `totalElements`, `totalPages`; supplier sees only owned active items. Input includes supplierId, name, category, quantity, reorderLevel, unitPrice. Flag `needsPriceReview`; avoid treating it as sellable. |
| Orders | `GET /api/orders`, `GET /api/orders/{id}`, `POST /api/orders`, `PATCH /api/orders/{id}/status?status=...` | Create CUSTOMER only: `{items:[{itemId,quantity}],deliveryAddress}`; backend determines customer and supplier, reserves stock and returns totals. List scope depends on role. Status values PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED. Guard allowed transitions and handle HTTP 409. |
| Notifications | `GET /api/notifications`, `GET /api/notifications/all` | Own list for signed-in user; all is ADMIN. No mark-read, polling guarantee, or push endpoint; do not show invented read state. |

Contract caveats: There is no dedicated dashboard/analytics, search/filter, pagination on orders/notifications, payment, invoice, return, procurement approval or partial fulfillment API. Dashboard numbers derive from accessible list data and are labeled accordingly; use client-side filters only on retrieved records and never claim complete totals when data is paginated. Do not add operational forms without corresponding backend endpoints. Order prices are server-side snapshots; refresh totals from the saved response. Supplier ID is fixed during inventory edits. Profile update requires `ownerUserId` in the request shape but backend does not permit ownership change; preserve existing value.

## Navigation and screens

- Public: welcome, sign-in, customer registration, demo entry.
- Shared signed-in shell: role-aware overview, Orders (list/detail), Inventory (list/detail), Notifications, account menu and theme control.
- Customer: catalog, cart/review, order confirmation/history; no stock editing.
- Supplier: my profile, my items, owned orders and status actions.
- Manager: inventory operations, supplier directory, all orders.
- Admin: supplier onboarding, account provisioning, inventory and order operations, all notifications.
- Demo: representative overview, catalog, supplier and order samples in read-only mode; prominent demo badge and sign-in call to action.
- Settings: only local appearance/session options supported by current API; no invented account-edit workflow.

## Six sequential phases and acceptance checks

- [x] Separate UI repository created: `rehman4113/ManiLogix-UI`.
- [x] API and UI flow plan drafted against current Modulith controllers.
- [ ] **1. Foundation:** initialize React/TypeScript/Vite on `dev`, route shell, tokens, typography, theme, reusable inputs/table/cards/drawer, typed API models. Check desktop and mobile shell, keyboard focus and build.
- [ ] **2. Core operations:** dashboard derived from permitted data, inventory/catalog/list/detail/editor, supplier directory/detail/onboarding and orders list/detail. Check role visibility and loading/empty/error states with API fixtures.
- [ ] **3. Transactions and admin:** cart/review/order placement, allowed status and cancellation actions, admin user provisioning, supplier profile edits, inventory deactivation, notifications. Verify each form/transition against existing API request/response and 403/409 behavior. Financial information is limited to existing order line prices and totals; invoices/payments remain documented future work.
- [ ] **4. Identity and demo:** login/signup, token handling, route guards, logout, read-only demo fixtures, persistent theme. Check demo cannot mutate, supplier cannot access other suppliers' data, and session expiry has clear recovery.
- [ ] **5. Experience polish:** responsive layouts, accessible controls/labels/focus, search and filters with explicit scope, skeletons, empty/error/permission states, reduced motion and cross-theme contrast.
- [ ] **6. Verification:** build/typecheck, targeted component and API-contract tests, complete role-based journeys and browser/mobile review. Record real backend connectivity evidence separately from mocked checks; fix discovered issues; report each phase complete only when verified.

Finish one phase before starting the next. If backend is unavailable, finish UI with contract fixtures but explicitly leave live integration unverified. Work stays on the development branch; no production deployment or main merge without the user's decision.

## Deferred backend-dependent work

Invoices, payments, returns, purchasing approvals, partial shipment/fulfillment, stock movement history, notification read tracking, richer dashboard analytics, order pagination and server-side search need backend contracts first. Track separately as future enhancements; do not disguise demo data as live data.
