## What does this PR do?
<!-- RNR: To implement GitHub branching 
Branch Structure:
main          ← production (Lovable hosting deploys from here)
develop       ← integration branch (Lovable pushes HERE, not main)
feature/*     ← human-authored features
fix/*         ← bug fixes
hotfix/*      ← urgent production patches
The Workflow:
Lovable AI  →  develop  →  PR review  →  main  →  Production
Human dev   →  feature/my-thing  →  PR to develop  →  main
Urgent fix  →  hotfix/issue  →  PR directly to main
 -->

## Type of change
- [ ] 🤖 Lovable AI generated
- [ ] 👤 Human authored
- [ ] 🔥 Hotfix (bypasses develop → goes direct to main)
- [ ] 🔧 Chore / dependency update

## Affected areas
- [ ] UI / Frontend
- [ ] Auth / Permissions
- [ ] Database / Supabase schema
- [ ] API / Edge Functions
- [ ] Configuration / Environment

## Testing done
- [ ] Tested in Lovable preview
- [ ] Tested locally
- [ ] No regressions observed
- [ ] N/A — non-functional change

## Security checklist
- [ ] No secrets, API keys, or tokens committed
- [ ] No new external dependencies introduced without review
- [ ] RLS policies unaffected (or updated intentionally)

## Notes for reviewer
<!-- Anything the reviewer should know, e.g. env vars needed, migrations to run -->
