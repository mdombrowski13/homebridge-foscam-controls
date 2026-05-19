# homebridge-foscam-controls

A [Homebridge](https://homebridge.io) plugin that integrates Foscam IP camera controls into Apple HomeKit.

Control your Foscam cameras directly from the Home app — toggle spotlights, arm security modes, trigger automations, and expand to additional camera features over time. Supports multiple cameras from a single plugin instance, with no cloud dependency and no internet traffic required.

> **v1.0** — Spotlight (white LED) control.
> **v1.1** — Security System module: arm/disarm Foscam motion detection with stay, away, and night modes.
> Streaming is explicitly out of scope — use [homebridge-camera-ffmpeg](https://github.com/Sunoo/homebridge-camera-ffmpeg) for video streaming.

[![verified-by-homebridge](https://img.shields.io/badge/homebridge-verified-blueviolet?color=%23491F59&style=for-the-badge&logoColor=%23FFFFFF&logo=homebridge)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

---

## How It Works

Foscam IP cameras expose a local HTTP CGI API on your network. This plugin communicates directly with each camera using that API — no account, no cloud service, no internet connection required. Each camera is registered as a HomeKit accessory and can expose one or more control modules depending on which features are enabled in your config.

The **Spotlight module** exposes a Lightbulb service for white LED on/off control. The **Security System module** exposes a Security System service that maps HomeKit arm modes (stay, away, night) to Foscam motion detection actions, with optional PTZ preset positioning on arm and disarm. A **Motion Sensor module** (surfacing live motion events to HomeKit) and a **Temperature Sensor module** for supported cameras are planned for future releases.

> **Note:** This plugin uses Foscam's CGI API, which Foscam has published and documented. Credentials are transmitted over plain HTTP unless your camera is configured for HTTPS. See [Known Limitations](#known-limitations).

---

## Requirements

- [Homebridge](https://homebridge.io) v1.8.5 or later, including v2.x
- Node.js v18, v20, or v22 (v22 recommended)
- One or more Foscam IP cameras
- Your camera's local IP address, port, username, and password
- The camera must be reachable on the same local network as your Homebridge server
- **Spotlight module:** camera must have white spotlight LEDs
- **Security System module:** camera must support motion detection configuration via CGI API; PTZ preset features require a PTZ-capable camera with presets configured in the Foscam app or web UI

---

## Supported Cameras

The plugin auto-detects which CGI API variant your camera supports and uses the correct one automatically — for both spotlight control and motion detection configuration.

**Confirmed working:**
- Foscam MDS8010

Cameras in the R2, R4, FI9900P, SD4, and similar series are also expected to work.

Cameras with **infrared (IR) night-vision LEDs only** (no white spotlight) are not supported by the spotlight module — IR LED control is planned for a future release.

---

## Finding Your Camera's IP and Port

1. Log in to your router's admin page and look for your camera under connected devices
2. Assign a **static (reserved) IP address** to your camera's MAC address — this prevents the IP from changing on router reboots
3. The default Foscam HTTP port is **88**; HTTPS is **443**
4. Confirm the camera is reachable by visiting `http://<cameraIP>:88/cgi-bin/CGIProxy.fcgi?cmd=getDevInfo&usr=<username>&pwd=<password>` in a browser — you should receive an XML response

---

## Installation

### From npm

```bash
npm install -g homebridge-foscam-controls
```

Then add the platform block to your `config.json` (see Configuration below) and restart Homebridge.

### Via Homebridge UI

1. Open the Homebridge UI
2. Go to **Plugins** and search for `homebridge-foscam-controls`
3. Click **Install**
4. Configure via the plugin settings form and restart Homebridge

### From Git

```bash
git clone <repository-url>
cd homebridge-foscam-controls
npm install --omit=dev
sudo npm link
```

---

## Configuration

### Manual config.json

```json
{
  "platforms": [
    {
      "platform": "FoscamControls",
      "name": "Foscam Controls",
      "cameras": [
        {
          "name": "Loft Camera",
          "host": "10.0.1.231",
          "port": 88,
          "username": "admin",
          "password": "your_password",
          "modules": {
            "spotlight": true,
            "security": {
              "enabled": true,
              "stay":  ["record"],
              "away":  ["email", "snap", "record"],
              "night": ["snap", "record"],
              "armPreset": "loft",
              "disarmPreset": "loft",
              "sensitivity": 2,
              "triggerInterval": 5
            }
          }
        }
      ]
    }
  ]
}
```

### Platform-Level Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `platform` | string | ✅ | — | Must be `FoscamControls` |
| `name` | string | ✅ | — | Display name for the platform in Homebridge logs |
| `cameras` | array | ✅ | — | Array of camera configurations (one per physical camera) |

### Per-Camera Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string | ✅ | — | Display name for this accessory in HomeKit |
| `host` | string | ✅ | — | Local IP address of the camera |
| `port` | number | — | `88` | HTTP port of the camera's CGI API. Use `443` for HTTPS. |
| `username` | string | ✅ | — | Camera login username |
| `password` | string | ✅ | — | Camera login password |
| `pollIntervalSeconds` | number | — | `0` | Background poll interval in seconds. `0` disables polling — state is fetched live on demand. Minimum `10` if enabled. |
| `modules` | object | — | `{ spotlight: true }` | Which control modules to enable for this camera |

---

## Modules

### Spotlight Module (v1.0)

Exposes a **Lightbulb** service for white LED on/off control.

| Field | Type | Default | Description |
|---|---|---|---|
| `spotlight` | boolean | `true` | Enable white spotlight control |

Each camera with `spotlight: true` appears in the Home app as a Lightbulb. The module auto-detects which spotlight API variant your camera supports (`getWhiteLightBrightness` or `getWhiteLightStatus`) on first use.

---

### Security System Module (v1.1)

Exposes a **Security System** service. Arms and disarms Foscam motion detection from HomeKit with stay, away, and night modes. Optionally moves the camera to a PTZ preset on arm and disarm.

#### Security Config Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `enabled` | boolean | — | `false` | Enable the Security System module for this camera. When false, no SecuritySystem tile appears in HomeKit. |
| `stay` | array | ✅ | — | Actions to take on motion detection when in Stay mode (see Linkage Actions below) |
| `away` | array | ✅ | — | Actions to take on motion detection when in Away mode |
| `night` | array | ✅ | — | Actions to take on motion detection when in Night mode |
| `armPreset` | string | — | — | PTZ preset name to move to when arming. Must exist on the camera. |
| `disarmPreset` | string | — | — | PTZ preset name to move to when disarming. Must exist on the camera. |
| `sensitivity` | integer | — | `2` | Motion detection sensitivity (see table below) |
| `triggerInterval` | integer | — | `5` | Passed directly to camera. Actual cooldown = value + 5 seconds (e.g. `5` → 10s actual, `0` → 5s actual). Valid range: 0–10. |
| `motionDetectVersion` | integer | — | auto | Force motion detect API version: `0` or `1`. Leave unset for auto-detection. |

#### Linkage Actions (stay / away / night)

Each arm mode takes a string array listing the actions to trigger on motion detection. Only include the actions you want enabled — absent actions are treated as disabled, keeping your JSON clean.

| Value | Action | Bitmask |
|---|---|---|
| `"ring"` | Ring / buzzer | 1 |
| `"email"` | Send email alert | 2 |
| `"snap"` | Snap a picture | 4 |
| `"record"` | Record video | 8 |
| `"io"` | Trigger IO output | 16 |

**Example:** `"away": ["email", "snap", "record"]` — sends email, snaps a picture, and records video on motion detection when in Away mode.

An empty array `[]` means motion detection is enabled but no actions are taken.

#### Sensitivity Values

| Value | Label |
|---|---|
| `0` | Low |
| `1` | Normal |
| `2` | High *(default)* |
| `3` | Lower |
| `4` | Lowest |

#### PTZ Presets

PTZ presets must be **configured on the camera** using the Foscam app or web interface before they can be referenced here. The plugin validates configured preset names against the camera's preset list at startup and logs a warning with available preset names if a mismatch is found.

> **Preset naming:** The `armPreset` and `disarmPreset` values must exactly match the preset name as it appears on the camera (case-sensitive).

#### Arm / Disarm Sequence

The security module uses a deliberate operation order to prevent PTZ movement from triggering false motion alarms:

- **Arming:** Move to `armPreset` → then enable motion detection
- **Disarming:** Disable motion detection → then move to `disarmPreset`

If no preset is configured, or if the preset move fails, the arm/disarm state is still applied and the error is logged as a warning.

#### API Version Auto-Detection

The module automatically detects whether your camera uses the v0 (`getMotionDetectConfig`) or v1 (`getMotionDetectConfig1`) motion detect API. The detected version is logged on first startup. If your camera has unusual firmware, use `motionDetectVersion` to force a specific version.

#### Offline Camera Behaviour

If the camera is unreachable when Homebridge starts, the Security System tile appears in HomeKit in the **Disarmed** state. The plugin continues polling in the background and recovers the actual camera state automatically when the camera comes back online — without restarting Homebridge.

---

## HomeKit Behaviour

### Spotlight Module

| Element | Behaviour |
|---|---|
| Room tile | Shows spotlight as On / Off |
| Toggle | Immediately sends on/off command to the camera |
| Siri | "Hey Siri, turn on the loft camera light" |
| State sync | Fetched live from camera on demand; or polled if `pollIntervalSeconds` is set |

### Security System Module

| Element | Behaviour |
|---|---|
| Room tile | Shows current arm state: Home, Away, Night, or Disarmed |
| Mode change | Moves PTZ preset (if configured), then arms/disarms motion detection |
| Siri | "Hey Siri, set loft camera to away" / "disarm loft camera" |
| Automations | Arm/disarm on time of day, location, other accessories |
| State sync | Reads motion detect config from camera on startup and on each poll cycle |

> **Tip:** Combine the Security System with the Spotlight module — create a HomeKit automation to turn on the spotlight when you arm the camera to Away mode at night.

---

## Planned Features (Future Releases)

### Motion Sensor Module (`modules.motion`)

Polls the camera for live motion detection events and surfaces them as a HomeKit **Motion Sensor** tile. This enables automations such as:
- Turn on the spotlight when motion is detected
- Send a notification when the camera detects motion while armed
- Trigger a scene when motion clears

> **Why is this separate from the Security System?** The Security System module configures *what the camera does* when motion is detected (record, email, snap). The Motion Sensor module reads *whether motion is currently happening* and surfaces that to HomeKit. These are separate concerns and can be used independently — you may want motion sensor automations without using the security arming system, or vice versa.

> **Note on homebridge-newfoscam:** homebridge-newfoscam included a motion sensor that polled `getDevState` every 1 second. In our testing this never reliably triggered due to bugs in the polling loop and firmware differences in how `motionDetectAlarm` is reported. We are implementing this as a dedicated, well-tested module rather than porting the broken implementation.

### PTZ Preset Dropdowns in Homebridge UI

Currently `armPreset` and `disarmPreset` are free-text fields. A future release will add a **Custom Plugin UI** that fetches the preset list directly from your camera when you open the config form, and displays them as a dropdown — preventing typos and making it clear which presets are available. Requires `@homebridge/plugin-ui-utils`.

In the meantime, the plugin validates your configured preset names against the camera at startup and logs a warning with available preset names if they don't match.

### IR LED Module (`modules.irLed`)

Control the infrared LED state independently of the white spotlight, for cameras that expose IR LED control via the CGI API.

### Temperature Sensor Module (`modules.temperature`)

Some Foscam cameras, such as FosBaby models, expose temperature sensor data. A future module will read temperature from cameras that support it and surface it to HomeKit as a **Temperature Sensor** accessory.

---

## Migrating from homebridge-newfoscam

If you are moving from homebridge-newfoscam, note these differences:

### Config structure

newfoscam puts security fields flat at the camera root. This plugin nests them under `modules.security`:

```json
// homebridge-newfoscam (old)
{
  "name": "Loft Camera",
  "host": "10.0.1.231",
  "stay": 8,
  "away": 14,
  "night": 12,
  "armPreset": "loft"
}

// homebridge-foscam-controls (new)
{
  "name": "Loft Camera",
  "host": "10.0.1.231",
  "modules": {
    "security": {
      "enabled": true,
      "stay":  ["record"],
      "away":  ["email", "snap", "record"],
      "night": ["snap", "record"],
      "armPreset": "loft"
    }
  }
}
```

### Linkage values → action arrays

newfoscam uses integer bitmask values for `stay`, `away`, and `night`. This plugin uses string arrays listing only the enabled actions. Convert your values using this reference:

| newfoscam integer | This plugin |
|---|---|
| `8` | `["record"]` |
| `12` | `["snap", "record"]` |
| `14` | `["email", "snap", "record"]` |
| `15` | `["ring", "email", "snap", "record"]` |

For any other value, decompose the bitmask: 1=ring, 2=email, 4=snap, 8=record, 16=io. Only include the actions whose bits are set.

### Sensitivity

newfoscam remaps sensitivity values internally — your config value did not map 1:1 to the camera. **This plugin passes your value directly to the camera with no remapping.** If you were using `sensitivity: 2` in newfoscam, the camera was actually receiving `0` (Low). To maintain the same behaviour, change your config value to `0`. To keep the same config value and accept the different camera behaviour (High instead of Low), leave it as-is.

### triggerInterval

Both plugins pass `triggerInterval` directly to the camera (0–10 range). Behaviour is the same.

### Offline camera handling

homebridge-newfoscam crashes Homebridge (segfault) when a configured camera is unreachable at startup. This plugin handles offline cameras gracefully — the accessory appears as Disarmed and recovers automatically when the camera comes back online.

---

## Known Limitations

- **Credentials sent as URL query parameters** — this is a Foscam CGI API constraint. Use HTTPS (`port: 443`) if your camera supports it
- **PTZ preset names are case-sensitive** — the name must exactly match what is configured on the camera
- **PTZ preset dropdowns not yet available in Homebridge UI** — presets are validated at startup with a warning; a dynamic dropdown UI is planned
- **Motion events not surfaced to HomeKit** — the Motion Sensor module is planned for a future release
- **No push/event support** — the camera does not notify Homebridge when state changes externally; state is synced on the next poll cycle
- **Local network only** — the camera must be reachable from your Homebridge server

---

## Troubleshooting

**The accessory isn't appearing in HomeKit**
- Check Homebridge logs for errors on startup
- Confirm the camera is reachable: visit `http://<host>:<port>/cgi-bin/CGIProxy.fcgi?cmd=getDevInfo&usr=<username>&pwd=<password>` in a browser
- Restart Homebridge after any config change

**Spotlight not toggling**
- Confirm your username and password are correct
- Check logs — the plugin logs which API variant it detected and any error codes
- Verify your camera has a white spotlight (not IR-only)

**Security System not appearing**
- Check that `enabled` is `true` and `stay`, `away`, and `night` are all present as arrays
- Check Homebridge logs for a "Security module disabled" message with details

**Security System appears but arm/disarm has no effect**
- Confirm the camera is reachable and credentials are correct
- Check logs for the linkage value being sent — confirm it matches your intent
- Try setting `motionDetectVersion` to `0` or `1` to force a specific API version

**PTZ preset not moving**
- Confirm the preset name exactly matches what is configured on the camera (case-sensitive)
- Check Homebridge logs at startup — the plugin logs available preset names if your configured name is not found
- Confirm the camera is PTZ-capable and the preset exists in the Foscam app/web UI

**State in HomeKit doesn't match the camera**
- State is read from the camera on startup and on each poll cycle
- If polling is disabled (`pollIntervalSeconds: 0`), state is fetched live on demand — open the Home app to refresh
- If the camera is unreachable, the plugin shows the last known state

---

## License

MIT

---

## Acknowledgements

Built on top of [Homebridge](https://homebridge.io) and the [Foscam CGI API](https://www.foscam.com/Documents/Foscam-IPCamera-CGI-User-Guide-AllPlatforms.pdf).
