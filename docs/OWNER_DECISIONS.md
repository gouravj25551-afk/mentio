# Decisions only the owner can make

Nothing here has been decided in code. Each item lists what is blocked and what the code does today.

## 1. Which init migration is applied in production (blocks CI and fresh databases)

`prisma/migrations/20260101000000_init` and `prisma/migrations/20261005000000_init` both create the same enum types (`Role`, ...) and tables. They differ only in the `currency` default (`USD` vs `INR`). A fresh database fails with `type "Role" already exists`, so `npm test` and CI are red on `main` and a new environment cannot be created.

Migration history has not been touched. To decide: run `select migration_name from _prisma_migrations order by started_at;` on production. At most one of the two can have been applied. The one that was not applied can be removed from the repo. If neither is recorded, tell the developer before deploying anything.

## 2. Support address
`/privacy`, `/terms` and error pages refer to a "support address listed on the site". None exists. Pick one and add it.

## 3. Cancellation and refund policy
Sessions are free during the beta, so nothing is refunded. There is no rule for who may cancel when, or what happens to a student whose mentor is rejected or suspended. Today: nothing is cancelled automatically; admins see affected sessions under "Needs attention" and cancel them one by one if they choose.

## 4. Legal copy
`/privacy` and `/terms` are draft text. Have them reviewed before collecting real users' data.

## 5. Notify students when their mentor is suspended or rejected?
Today the student is not told until an admin cancels. Whether to message them, and what to promise, is a policy choice.

## 6. Pricing
Payments are not implemented. Mentors cannot set a price and a priced booking is refused.
