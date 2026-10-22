# Project context for AI coding assistants

This is the technology-enabled prototype for NUS IS4234 Group 26's report on the Wells Fargo
cross-selling scandal (GRC case study). It is a scaffold only — see `docs/PROTOTYPE_OVERVIEW.md`
for the four-layer control design and `docs/M1..M7` for the individual module specs.

Layout is a flat two-service structure (`backend/`, `frontend/`, `deploy/`), not a monorepo —
follows the same conventions as the group's other NUS project (`is4228`): Makefile-driven
install/dev/build, `start.sh` / `start.ps1` cross-platform launchers, Docker for hosting, and a
README with Overview / Background / What it does / Tech stack / Setup / Architecture notes /
Status / Limitations sections.

Stack is not yet chosen for `backend/` or `frontend/` — pick whatever the team can realistically
demo within the course timeline (a working, hosted proof of concept, not production-grade
code). When implementing a module, read its doc in `docs/` first — each one defines the problem
it addresses, required data inputs, workflow/logic, outputs/alerts/escalation behaviour, and
intended owner, matching the course's prototype-documentation rubric.
