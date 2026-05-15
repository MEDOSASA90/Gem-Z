# GEM Z Security Policy

## Reporting Security Issues

If you discover a security vulnerability in the GEM Z project, please follow these steps:

1. **Do NOT open a public issue** on GitHub or any public forum.
2. Send a detailed report to the project maintainers via the project's designated private communication channel.
3. Include as much detail as possible: steps to reproduce, potential impact, and any suggested fixes.
4. Allow a reasonable amount of time for the issue to be addressed before any public disclosure.

## Secrets Management

### Where Secrets Are Stored

- **All secrets, credentials, and sensitive configuration MUST be stored only in `.env` files.**
- The `.env` file is never committed to version control (it is listed in `.gitignore`).
- Each environment (development, staging, production) should have its own `.env` file (e.g., `.env`, `.env.staging`, `.env.production`).

### Required Secrets

The following secrets are required for the application to run:

- Database connection strings and passwords
- API keys for external services
- JWT or session signing secrets
- Any third-party service credentials

### How to Rotate Secrets

1. **Generate a new secret** using a cryptographically secure method:
   ```bash
   # Example: generate a strong random secret
   openssl rand -base64 64
   ```
2. **Update the `.env` file** on the server or local environment with the new secret.
3. **Restart the application** to pick up the new values.
4. **Revoke the old secret** from the respective service (database, API provider, etc.).
5. **Update any CI/CD secrets** or deployment configurations if applicable.

## Committing `.env` Files

**NEVER commit `.env` files to version control.** This includes:

- `.env`
- `.env.local`
- `.env.production`
- `.env.staging`
- `.env.*`

These files are already listed in `.gitignore`, but always double-check before committing.

## Security Best Practices

- Do not use weak or default values for any secrets.
- Use environment-specific secrets (never reuse production secrets in development).
- Regularly rotate secrets, especially after any team member changes or suspected exposure.
- Validate that all required environment variables are present at application startup and fail fast with a descriptive error if any are missing.
- Import all configuration values from the centralized `config` module (`../config`).
