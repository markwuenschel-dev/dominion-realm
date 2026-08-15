# Stay static; handle dynamic needs with embedded third-party services

The Dominion Realm showcase remains a fully static Astro site on free hosting (GitHub Pages + Netlify) with no application backend; anything dynamic — email capture, analytics, search — is delegated to embedded hosted services rather than a server we operate. For a solo author's pre-launch presence site, zero-ops, zero-cost, and durability matter far more than backend capability, and every dynamic need we have is well served by a hosted product.

Status: superseded by [ADR-0010](0010-migrate-astro-to-nextjs.md) (Astro / static posture) and [ADR-0012](0012-host-on-aws-ec2.md) (hosting).

Considered: serverless functions and a full app/backend — rejected as unnecessary ongoing maintenance for the value they'd add right now.
