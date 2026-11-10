# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)

## [0.1.0] - Unreleased

First release of the Twake Contacts frontend, a Single Page Application allowing users to
interact with their contacts. It shares its technical stack with the Twake Calendar frontend
and interacts with twake-calendar-side-service, which serves `esn-sabre` (CardDAV).

### Added

- Private contacts application for authenticated users
- OIDC login flow
- Address book and contact listing over CardDAV
- Multi-language support
- Runtime configuration via static JS files
