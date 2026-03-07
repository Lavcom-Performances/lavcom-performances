# Git Branching & CI Setup

Drop the contents of this folder into the root of your GitHub repository.

---

## What's included

```
.github/
├── CODEOWNERS                        ← Auto-assign reviewers on PRs
├── BRANCH_PROTECTION.yml             ← Guide for configuring branch rules in GitHub UI
├── pull_request_template.md          ← Auto-fills when opening any PR
└── workflows/
    ├── ci.yml                        ← Runs on every PR: lint, build, secret scan, audit
    ├── release.yml                   ← Manual trigger: promotes develop → main
    └── hotfix.yml                    ← Auto-runs CI when a hotfix/* branch is pushed
```

---

## Setup checklist

### Step 1 — Copy files
Drop this `.github/` folder into the root of your repo and push to `develop`.

### Step 2 — Create the develop branch
```bash
git checkout main
git checkout -b develop
git push origin develop
```

### Step 3 — Reconnect Lovable
In Lovable: **Settings → GitHub → change synced branch** from `main` to `develop`.

### Step 4 — Apply branch protection rules
Follow the instructions in `.github/BRANCH_PROTECTION.yml`.
Go to: **GitHub Repo → Settings → Branches → Add rule**

### Step 5 — Update CODEOWNERS
Edit `.github/CODEOWNERS` and replace `@YOUR-LEAD-DEV-USERNAME` with real GitHub usernames.

### Step 6 — Add GitHub Secrets (for CI env vars)
Go to: **GitHub Repo → Settings → Secrets and variables → Actions**
Add any secrets your build needs, e.g.:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then uncomment the relevant lines in `.github/workflows/ci.yml`.

### Step 7 — Add npm scripts (if missing)
Make sure your `package.json` has these scripts:
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "build": "vite build"
  }
}
```

---

## Day-to-day workflow

| Who | What | Branch |
|---|---|---|
| Lovable AI | Auto-commits UI changes | `develop` |
| Developer | New feature | `feature/my-feature` → PR to `develop` |
| Developer | Bug fix | `fix/my-fix` → PR to `develop` |
| Team lead | Ship to production | Run **Release** workflow manually |
| Any dev | Urgent production fix | `hotfix/issue` → PR directly to `main` |

---

## Shipping a release

1. Go to **GitHub → Actions → Release — Promote develop to main**
2. Click **Run workflow**
3. Enter a release note (e.g. `"Add user profile page, fix login bug"`)
4. Click **Run workflow** — it will merge, tag, and summarize automatically

---

## After a hotfix

Always back-merge `main` back into `develop` so they don't diverge:
```bash
git checkout develop
git merge main
git push origin develop
```
