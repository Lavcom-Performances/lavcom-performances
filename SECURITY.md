# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. Email security concerns to: **security@lavcom-performances.fr**
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact assessment
   - Any suggested fixes (optional)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Initial Assessment**: We will provide an initial assessment within 7 days
- **Resolution Timeline**: Critical vulnerabilities will be addressed within 14 days
- **Disclosure**: We will coordinate with you on public disclosure timing

### Scope

The following are in scope for security reports:

- Authentication and authorization bypasses
- SQL injection or other injection attacks
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Sensitive data exposure
- Row-Level Security (RLS) policy bypasses
- API security issues
- Edge function vulnerabilities

### Out of Scope

- Denial of service attacks
- Social engineering attacks
- Physical security issues
- Issues in third-party dependencies (report these upstream)

## Security Measures

### Authentication & Authorization

- All user data is protected by Row-Level Security (RLS) policies
- Multi-factor authentication (MFA) is available for enhanced account security
- Session tokens are securely managed with automatic expiration
- Rate limiting is implemented on authentication endpoints

### Data Protection

- All data is encrypted in transit (TLS 1.3)
- Database connections use encrypted channels
- Sensitive data is hashed (passwords, IP addresses for privacy)
- Personal data access is restricted by RLS policies

### Infrastructure Security

- Regular dependency vulnerability scanning via CI/CD
- CodeQL static analysis on all code changes
- Automated security audits on push and pull requests
- Weekly scheduled security scans

### Edge Functions

- All edge functions validate JWT tokens
- CORS policies are configured appropriately
- Input validation on all user-supplied data
- Rate limiting on sensitive operations

## Security Checklist for Contributors

Before submitting code changes, ensure:

- [ ] No secrets or API keys are hardcoded
- [ ] All user inputs are validated and sanitized
- [ ] RLS policies are in place for new tables
- [ ] Authentication is required for sensitive operations
- [ ] Error messages don't expose sensitive information
- [ ] Dependencies are from trusted sources

## Automated Security Scanning

This project uses automated security scanning:

- **npm audit**: Checks for known vulnerabilities in dependencies
- **CodeQL**: Static analysis for security issues in JavaScript/TypeScript
- **RLS Linter**: Validates Row-Level Security policies

Scans run on:
- Every push to main/master branches
- Every pull request
- Weekly scheduled scans (Mondays at 9 AM UTC)
- Manual workflow dispatch

## Security Updates

Security updates are applied as follows:

1. **Critical**: Patched within 24-48 hours
2. **High**: Patched within 7 days
3. **Medium**: Patched in next release cycle
4. **Low**: Evaluated and scheduled as appropriate

## Contact

For security-related inquiries:
- Email: security@lavcom-performances.fr
- Response time: Within 48 hours

---

*Last updated: January 2026*
