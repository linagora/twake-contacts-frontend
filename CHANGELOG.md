# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)

## [0.1.0] - Unreleased

First release of the Twake Contacts frontend, a Single Page Application allowing users to
interact with their contacts. It shares its technical stack with the Twake Calendar frontend
and interacts with `esn-sabre` (CardDAV) and an OpenPaaS / ESN backend.

### Added

- Private contacts application for authenticated users
- OIDC login flow and DAV JWT exchange
- Address book and contact listing over CardDAV
- Multi-language support
- Runtime configuration via static JS files, validated at startup: `SSO_BASE_URL`,
  `SSO_CLIENT_ID`, `SSO_SCOPE`, `SSO_REDIRECT_URI` and `SIDE_SERVICE_BASE_URL` are
  required, and a missing or malformed setting shows a page naming it
- Bounded API retry policy: 15 s timeout per attempt, reads retried twice, writes
  never replayed automatically
