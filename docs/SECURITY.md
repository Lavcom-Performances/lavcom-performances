# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. Email security concerns to: security@lavcom.fr
3. Include detailed steps to reproduce the vulnerability
4. Allow up to 48 hours for initial response

## Security Measures

### Authentication & Authorization
- **Email confirmation required** for new accounts
- **Role-based access control (RBAC)** via `user_roles` and `platform_roles` tables
- **Row Level Security (RLS)** on all database tables
- **No service role key in client code** - only anon key exposed
- **Leaked password protection** enabled in Supabase Auth

### Data Protection
- **All data access through RLS policies** - users can only access their own data
- **Audit logging** for sensitive operations via `audit_logs` table
- **IP hashing** for privacy-preserving logging
- **Input sanitization** in all edge functions

### API Security
- **Rate limiting** on all sensitive endpoints (auth, imports, AI)
- **Schema-based input validation** for all edge functions
- **CORS headers** properly configured
- **Secret redaction** in AI proxy to prevent credential leaks

### CI/CD Security
- **Automated dependency scanning** via npm audit
- **CodeQL analysis** for code vulnerabilities
- **Snyk integration** (optional) for enhanced scanning
- **TruffleHog secret scanning** to prevent credential commits
- **Dependabot** for automated dependency updates

### Content Security
- **Content Security Policy (CSP)** headers configured
- **XSS prevention** through React's built-in escaping
- **HTTPS enforced** in production

## Required GitHub Secrets

To enable all security features, configure these secrets in your repository:

| Secret Name | Description | Required |
|------------|-------------|----------|
| `SNYK_TOKEN` | Snyk API token for vulnerability scanning | Optional |
| `VITE_SUPABASE_URL` | Supabase project URL (can be in vars) | For builds |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (can be in vars) | For builds |

## Required Repository Settings

### Branch Protection (Recommended)
- Require pull request reviews before merging
- Require status checks to pass before merging
- Include administrators in restrictions
- Restrict who can push to matching branches

### GitHub Actions
- Enable Dependabot alerts
- Enable Dependabot security updates
- Enable code scanning alerts

## Edge Function Security

All edge functions follow these security patterns:

1. **Authentication verification** before processing
2. **Rate limiting** per user/IP
3. **Input validation** with schema enforcement
4. **Audit logging** for compliance
5. **Error handling** without leaking internal details

## Database Security

### RLS Policies Summary

| Table | User Access | Admin Access |
|-------|------------|--------------|
| `profiles` | Own row only | Read all |
| `projects` | Own rows only | Read all |
| `audit_logs` | None | Read only |
| `system_events` | None | Read only |

### Security Definer Functions

- `has_role()` - Check user roles without RLS recursion
- `rpc_create_audit_log()` - Insert audit logs securely
- `is_platform_admin()` - Verify platform admin status

## Compliance

- GDPR-ready with data retention controls
- Audit trail for all sensitive operations
- IP anonymization in logs
- User data export capability (via dashboard)
