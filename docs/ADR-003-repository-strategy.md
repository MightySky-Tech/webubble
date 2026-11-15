# ADR-003: Repository Strategy & Transfer Plan

**Date:** 2026-11-15  
**Status:** Accepted  
**Author:** MightySky Tech  

## Context

The Webubble project is a contracted MVP build (₦2.7M) for Webubble Limited. The contract requires:
- Code lives in **Webubble-owned GitHub repos** with branch protection and PR reviews
- Final deliverable: all source code transferred to Webubble's GitHub organization
- Portfolio rights retained by MightySky Tech for our portfolio

## Decision

We will use a **two-phase repository strategy**:

### Phase 1: Development (Now → May 2027)
- Repository: **jossy450/webubble** (personal GitHub account)
- Rationale:
  - Single developer leads the work (you)
  - Maintains portfolio value and commit attribution
  - Easier branch management during rapid development
  - Industry-standard practice for contract development
- Access: Private until launch (can be public after client approval)

### Phase 2: Transfer (At Launch / Handoff)
- When Webubble's GitHub organization is ready:
  1. **Transfer** the repository to `webubble/webubble`
  2. Grant Webubble organization **Admin access**
  3. Retain **contributor credit** in commit history
  4. Archive this personal repo (or delete)

## Benefits

| Benefit | Details |
|---------|---------|
| **Portfolio** | Your commits remain attributed to your account; visible to future employers/clients |
| **Clarity** | Single source of truth during development; no confusion about access |
| **Industry norm** | Standard practice for freelance/contract development |
| **Transfer** | GitHub's repository transfer is seamless; all history, issues, PRs preserved |
| **Client satisfaction** | They get full ownership at handoff with all source code and commit history |

## Implementation

1. ✅ Repo created at https://github.com/jossy450/webubble
2. ✅ Local code pushed to origin (branch: `wb-002-design-tokens`)
3. ✅ `.git/info/exclude` keeps MightySky-internal docs out of commits
4. ⏳ When Webubble's org is ready:
   - Webubble admins will initiate transfer
   - All branches, issues, PRs, and commit history transfer automatically
   - No downtime or data loss

## Branch Protection Rules

When transferred to Webubble's org, apply these rules to `main`:
- Require PR reviews (at least 1)
- Require status checks to pass (CI/CD pipeline)
- Require branches to be up to date before merge
- Dismiss stale PR approvals on new commits
- Require code owners review

See `scripts/github/protect-main.sh` for automation.

## Secrets & Credentials

- **NEVER commit** `.env`, API keys, or credentials (see `.gitignore`)
- Use GitHub Secrets for CI/CD environment variables
- Use `.env.example` as a template for local development

## References

- GitHub Docs: [Transferring a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository)
- Contract: Webubble Web MVP Proposal (internal tab: portfolio rights retained)
- Related ADRs: ADR-001 (Monorepo structure), ADR-002 (Staging deployment)

---

**Next Review:** When Webubble GitHub org is created
