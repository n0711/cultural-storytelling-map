# Code polishing conventions

- Use four-space Python indentation and two-space JavaScript/React indentation.
- Prefer descriptive function names and small entry-point functions for operational scripts.
- Comments should explain non-obvious constraints, import order, data ownership,
  or security and privacy tradeoffs. Avoid narrating obvious syntax.
- Utilities that only inspect data should use read-only connections and must not
  create a database just because an expected file is missing.
- Keep production service changes separate from demonstration scripts, and do not
  commit private keys, local databases, or demo credentials.

The Python CI job checks **syntax only**. It does not validate API integrations,
database migrations, the React UI, or end-to-end behavior. Those need their own
appropriate tests before deployment.
