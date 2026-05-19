# Changelog

All notable changes to this project will be documented in this file.

---

## [1.1.0] — Unreleased

### Added

- **Security System module** — arms and disarms Foscam motion detection from HomeKit with stay, away, and night modes
- **`modules.security.enabled` toggle** — explicit per-camera enable/disable for the Security System; when false only `"enabled": false` is written to JSON, keeping config clean
- **Linkage string array config** — `stay`, `away`, and `night` are string arrays listing only the enabled actions (`"ring"`, `"email"`, `"snap"`, `"record"`, `"io"`); absent entries are treated as disabled; JSON only contains what is actually enabled
- **PTZ preset support** — optional `armPreset` and `disarmPreset` config fields; camera moves to preset before arming and after disarming (deliberate ordering to prevent false motion alarms from camera movement)
- **PTZ preset validation** — on startup, fetches the camera's preset list and warns if a configured preset name is not found, logging all available preset names
- **Motion detect API auto-detection** — automatically detects whether the camera uses `getMotionDetectConfig` (v0) or `getMotionDetectConfig1` (v1); optional `motionDetectVersion` override to force a specific version
- **Offline camera resilience** — if a camera is unreachable at Homebridge startup the Security System tile appears as Disarmed and recovers automatically when the camera comes back online; no crash, no segfault
- **Startup linkage log** — on every Homebridge start, logs computed linkage numbers for Stay/Away/Night (e.g. `Stay: 8, Away: 14, Night: 12`) for easy cross-reference with homebridge-newfoscam
- **`computeLinkage()` helper** — converts a `LinkageAction[]` array into the integer bitmask the Foscam API expects
- **Generic XML field parser** — `parseAllFields()` on the API client extracts every `<tag>value</tag>` pair from a CGI response into a flat record; used for get-before-set motion detect config round-trips
- **`getMotionDetectConfig()`**, **`setMotionDetectConfig()`**, **`ptzGotoPresetPoint()`**, **`getPtzPresetPointList()`** methods on `FoscamApiClient`
- New types: `LinkageAction`, `SecurityConfig`, `SecurityState`
- **Security sections in `live-test` script** — variant detection, arm/disarm cycle, state confirmation, original state restore, PTZ preset list, and optional PTZ move

### Changed

- `ModuleConfig.security` changed from `boolean` (planned stub) to `SecurityConfig | false`
- **`stay`/`away`/`night` config format changed** — previously boolean objects (`{ record: true }`), now string arrays (`["record"]`); existing configs must be updated when upgrading to v1.1.0
- `README.md` — full Security System module documentation, migration guide from homebridge-newfoscam, updated planned features section

### Fixed

- Config UI: port field no longer renders as a slider (removed `maximum` constraint)
- Config UI: trigger interval field no longer renders as a slider
- Config UI: security fields only written to JSON when explicitly set by user

### Planned (documented, not yet implemented)

- **Custom Plugin UI** — full tabbed interface per camera using `@homebridge/plugin-ui-utils`; live credential validation, PTZ preset dropdowns populated from camera, Stay/Away/Night as proper labeled checkbox groups, linkage numbers shown live; replaces all current schema UI workarounds
- **Motion Sensor module** (`modules.motion`) — polls camera for live motion events, surfaces as HomeKit Motion Sensor; intentionally separate from Security System
- **IR LED module** (`modules.irLed`) — infrared LED on/off control
- **Temperature Sensor module** (`modules.temperature`) — reads temperature data from supported Foscam cameras, such as FosBaby models, and surfaces it as a HomeKit Temperature Sensor

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
