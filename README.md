# homebridge-foscam-controls

A [Homebridge](https://homebridge.io) plugin that integrates Foscam IP camera controls into Apple HomeKit.

Control your Foscam cameras directly from the Home app — toggle spotlights, trigger automations, and expand to additional camera features over time. Supports multiple cameras from a single plugin instance, with no cloud dependency and no internet traffic required.

> **v1.0 scope:** The initial release focuses on **spotlight (white LED) control**. Security system arming and motion detection are planned for future releases. Streaming is explicitly out of scope — use [homebridge-camera-ffmpeg](https://github.com/Sunoo/homebridge-camera-ffmpeg) for video streaming.

---

## How It Works

Foscam IP cameras expose a local HTTP CGI API on your network. This plugin communicates directly with each camera using that API — no account, no cloud service, no internet connection required. Each camera is registered as a HomeKit accessory and can expose one or more control modules depending on which features are enabled in your config.

In v1.0, each camera exposes a **Lightbulb accessory** for spotlight on/off control. Future releases will add additional HomeKit services (Security System, Motion Sensor) as optional per-camera modules alongside the existing lighting control.

> **Note:** This plugin uses Foscam's CGI API, which Foscam has published and documented. The API has been stable across many camera generations, but behavior may vary slightly by model and firmware version. Credentials are transmitted over plain HTTP unless your camera is configured for HTTPS. See [Known Limitations](#known-limitations).

---

## Requirements

- [Homebridge](https://homebridge.io) v1.8.5 or later, including v2.x
- Node.js v18, v20, or v22 (v22 recommended)
- One or more Foscam IP cameras with white spotlight LEDs (v1.0)
- Your camera's local IP address, port, username, and password
- The camera must be reachable on the same local network as your Homebridge server

---

## Supported Cameras

The spotlight module auto-detects which CGI API variant your camera supports (`getWhiteLightBrightness` or `getWhiteLightStatus`) and uses the correct one automatically.

**Confirmed working:**
- Foscam MDS8010

Cameras in the R2, R4, FI9900P, SD4, and similar series that include a white spotlight are also expected to work.

Cameras with **infrared (IR) night-vision LEDs only** (no white spotlight) are not supported by the spotlight module — IR LED control uses different commands and is planned for a future release.

If you are unsure whether your camera has a white spotlight, look for a visible white light that activates during night-vision events in color mode.

---

## Finding Your Camera's IP and Port

1. Log in to your router's admin page and look for your camera under connected devices
2. Assign a **static (reserved) IP address** to your camera's MAC address — this prevents the IP from changing on router reboots
3. The default Foscam HTTP port is **88**; HTTPS is **443**
4. Confirm the camera is reachable by visiting `http://<cameraIP>:88/cgi-bin/CGIProxy.fcgi?cmd=getDevInfo&usr=<username>&pwd=<password>` in a browser — you should receive an XML response

---

## Installation

### From npm (once published)

```bash
npm install -g homebridge-foscam-controls
```

Then add the platform block to your `config.json` (see Configuration below) and restart Homebridge.

### From Git

```bash
git clone <repository-url>
cd homebridge-foscam-controls
npm install --omit=dev
sudo npm link
```

**To update:**

```bash
cd homebridge-foscam-controls
git pull
sudo npm link
sudo hb-service restart
```

> No build step needed — compiled output is included in the repository.

### Via Homebridge UI (once published to npm)

1. Open the Homebridge UI
2. Go to **Plugins** and search for `homebridge-foscam-controls`
3. Click **Install**
4. Configure via the plugin settings form (see Configuration below)
5. Restart Homebridge

---

## Configuration

### Homebridge UI

After installing the plugin, click the **Settings** button to open the configuration form. Each entry in the `cameras` array becomes its own HomeKit accessory with its enabled modules.

### Manual config.json

```json
{
  "platforms": [
    {
      "platform": "FoscamControls",
      "name": "Foscam Controls",
      "cameras": [
        {
          "name": "Driveway Camera",
          "host": "192.168.1.101",
          "port": 88,
          "username": "admin",
          "password": "your_password",
          "modules": {
            "spotlight": true
          }
        },
        {
          "name": "Backyard Camera",
          "host": "192.168.1.102",
          "port": 88,
          "username": "admin",
          "password": "your_password",
          "modules": {
            "spotlight": true
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
| `port` | number | — | `88` | HTTP port of the camera's CGI API |
| `username` | string | ✅ | — | Camera login username |
| `password` | string | ✅ | — | Camera login password |
| `pollIntervalSeconds` | number | — | `0` | Background poll interval in seconds. `0` (default) disables polling — state is fetched live on demand. Minimum `10` if enabled. |
| `modules` | object | — | `{ "spotlight": true }` | Which control modules to enable for this camera |

### Module Fields (v1.0)

| Module | Type | Default | Description |
|---|---|---|---|
| `spotlight` | boolean | `true` | Enable white spotlight on/off control (Lightbulb service) |

> **Security note:** Credentials are included as URL query parameters in HTTP requests, which is how the Foscam CGI API works. If your camera supports HTTPS (port 443), set `port` to `443` to encrypt traffic on your local network.

---

## HomeKit Behavior

### Spotlight Module (v1.0)

Each camera with `spotlight: true` appears in the Home app as a **Lightbulb accessory**.

| Element | Behavior |
|---|---|
| Room tile | Shows spotlight as On / Off |
| Toggle | Immediately sends on or off command to the camera |
| Automations | "When an accessory is controlled" — trigger scenes or notifications when spotlight toggles |
| Siri | "Hey Siri, turn on the driveway spotlight" / "turn off the backyard camera light" |
| State sync | Spotlight state is fetched live from the camera whenever HomeKit requests it |

> **Tip:** Combine with a motion sensor accessory to automatically turn the spotlight on when motion is detected and off again after a delay.

---

## Planned Modules (Future Releases)

| Module | HomeKit Service | Description |
|---|---|---|
| `security` | Security System | Arm / disarm the camera's built-in security system (stay, away, night modes) |
| `motion` | Motion Sensor | Surface camera motion detection events as a HomeKit motion sensor |
| `irLed` | Lightbulb | Control infrared LED state independently of the white spotlight |

> Streaming is **not planned** for this plugin. Use [homebridge-camera-ffmpeg](https://github.com/Sunoo/homebridge-camera-ffmpeg) for RTSP video streaming from Foscam cameras.

---

## Known Limitations

- **Credentials sent as URL query parameters** — this is a Foscam CGI API constraint. On plain HTTP (`port: 88`), credentials are visible in network traffic on your local network. Use HTTPS (`port: 443`) if your camera supports it
- **Model compatibility may vary** — the spotlight CGI commands are available on most modern Foscam cameras with white spotlights but are not universal across all models and firmware versions. The plugin auto-detects the correct command variant for your camera
- **No push/event support** — the camera does not notify Homebridge when state changes externally (e.g. from the Foscam app, VMS, or a camera-internal schedule); state reflects the camera the next time HomeKit polls
- **Local network only** — the camera must be reachable from your Homebridge server; remote/cloud access is not supported

---

## Troubleshooting

**The accessory isn't appearing in HomeKit**
- Check the Homebridge logs for errors on startup
- Confirm the camera is reachable: visit `http://<host>:<port>/cgi-bin/CGIProxy.fcgi?cmd=getDevInfo&usr=<username>&pwd=<password>` in a browser from the same network
- Restart Homebridge after any config change

**Commands aren't working / spotlight not toggling**
- Confirm your username and password are correct in the camera's web admin interface
- Check the Homebridge logs — the plugin will log which API variant it detected and any error codes returned by the camera
- Verify your camera model has a white spotlight (see Supported Cameras above)

**State in HomeKit doesn't match the camera**
- State is fetched live each time HomeKit requests it — open the Home app or ask Siri to refresh
- If the camera is unreachable, the plugin falls back to the last known state and logs a warning

**Homebridge UI isn't showing a settings form**
- Ensure you're on Homebridge UI v4.x or later

---

## License

MIT

---

## Acknowledgements

Built on top of [Homebridge](https://homebridge.io) and the [Foscam CGI API](https://www.foscam.com/Documents/Foscam-IPCamera-CGI-User-Guide-AllPlatforms.pdf).
