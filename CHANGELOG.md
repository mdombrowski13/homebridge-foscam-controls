# Changelog

All notable changes to this project will be documented in this file.

---

## [1.0.1] — 2026-04-22

### Fixed

- `config.schema.json` — moved `required` from individual field properties to object-level arrays (JSON Schema compliance)
- `package.json` — removed redundant `peerDependencies` block; `engines.homebridge` already declares the version requirement

---

## [1.0.0] — 2026-04-21

### Initial Release

- **Spotlight module** — on/off control of Foscam white spotlight LEDs via HomeKit Lightbulb accessory
- **Multi-camera support** — configure any number of cameras; each registers as an independent HomeKit accessory
- **Auto API detection** — automatically detects whether the camera uses the `getWhiteLightBrightness` or `getWhiteLightStatus` CGI variant
- **Live state fetching** — `onGet` queries the camera directly for real-time state; no background polling by default
- **Homebridge 1.x and 2.x compatible** — written to HAP-nodejs v1.0.0 API patterns throughout
- **No production dependencies** — zero runtime dependencies; all tooling is devDependencies only
- **Confirmed working on Foscam MDS8010**
