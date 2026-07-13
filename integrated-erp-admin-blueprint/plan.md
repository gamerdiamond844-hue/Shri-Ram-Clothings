# Report Plan

## Meta
- **Type**: Technical proposal / ERP integration blueprint
- **Topic**: Transform the existing website admin dashboard into a complete integrated retail ERP without creating a separate site, login, or subdomain
- **Audience**: Founder, product owner, senior engineers, solution architects
- **Language**: English

## Theme
- **Name**: Indigo Dusk
- **Colors**:
  - Background: `#f5f7fa`
  - Surface: `#ffffff`
  - Text: `#0e1322`
  - Text Muted: `#5a647a`
  - Border: `#e2e6ee`
  - Primary: `#4a36e3`
  - Secondary: `#ece8ff`
- **Document Font**: CrimsonPro
- **Monospace Font**: IBMPlexMono

## Structure
1. Executive decision — State the recommended direction and the core architecture stance
2. Current fit-gap — Summarize what already exists in the current project and what is still missing
3. Non-negotiables — Capture the user’s hard constraints for in-dashboard ERP integration
4. Target application architecture — Describe frontend shell, route tree, backend services, data boundaries, and shared auth
5. ERP domain modules — Define the major bounded contexts and their ownership
6. RBAC and tenant isolation — Specify role model, permission enforcement, and business/store/warehouse scoping
7. Data platform and migration — Explain the path from the current Express + `pg` bootstrap to NestJS + Prisma + PostgreSQL
8. Realtime, jobs, and integrations — Cover WebSockets, BullMQ, FCM, printing, barcode, Cloudinary, and exports
9. Security and audit — Define enterprise-grade controls, immutable logs, and compliance-ready traces
10. Delivery path — Break implementation into practical phases without disrupting the live website
11. First build slice — Recommend the first production slice to implement immediately

## Visuals
| Visual | Type | Tool | Purpose |
|--------|------|------|---------|
| Chart 1 | Horizontal bar | ECharts | Show current architectural readiness by capability area |
| Chart 2 | Stacked bar | ECharts | Show phased rollout coverage by delivery wave |
| Diagram 1 | Flowchart | Mermaid | Show the single-application route and auth flow |
| Diagram 2 | Flowchart | Mermaid | Show the target service and event architecture inside the same product |

## Key Arguments / Thesis
- The ERP should be built as a set of first-class admin modules inside the existing React admin shell, not as a separate product.
- The current codebase already contains the correct foundation: shared auth, role-aware routing, tenant scoping, ERP tables, and integrated admin navigation.
- The biggest gap is not navigation, but domain depth: transactional POS, stock ledger integrity, accounting, approvals, immutable audit, and operational workflows still need full implementation.
- NestJS and Prisma should be introduced as an internal backend evolution, not as a second website or second authentication surface.
- The safest path is a phased strangler migration that keeps `/admin/*` and the current login intact while moving ERP domains onto a modular service layer.
