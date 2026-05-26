# Security Policy

## Supported Versions

Runtimee is currently in pre-1.0 development. Only the latest release receives security updates.

| Version | Supported          |
|---------|--------------------|
| < 1.0   | :white_check_mark: latest only |

## Reporting a Vulnerability

Please **do not** file a public GitHub issue for security vulnerabilities.

Send details to the project maintainers via a private method. If no private channel is advertised yet, please open a normal issue with a general description (not including exploit details) and request private contact information.

We will acknowledge receipt within 48 hours and provide an initial assessment within 5 business days.

## Preferred Cryptography

Runtimee uses standard elliptic curve cryptography (secp256k1 via viem). We do not implement custom cryptographic primitives.
