import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './constants';
import { FoscamCameraAccessory } from './accessory';
import { CameraConfig, PluginConfig } from './types';

const MIN_POLL_INTERVAL = 10;
const DEFAULT_POLL_INTERVAL = 0;

export class FoscamControlsPlatform implements DynamicPlatformPlugin {
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    private readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.api.on('didFinishLaunching', () => { this.discoverDevices(); });
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.accessories.push(accessory);
  }

  private discoverDevices(): void {
    const pluginConfig = this.config as unknown as PluginConfig;
    const cameras: CameraConfig[] = pluginConfig.cameras ?? [];

    for (const camera of cameras) {
      camera.pollIntervalSeconds = this.enforcePollInterval(camera);

      const uuid = this.api.hap.uuid.generate(`${camera.host}:${camera.port}`);
      const existing = this.accessories.find(a => a.UUID === uuid);

      if (existing) {
        this.log.info(`Restoring cached accessory: ${existing.displayName}`);
        new FoscamCameraAccessory(this, existing, camera);
      } else {
        this.log.info(`Registering new accessory: ${camera.name}`);
        const accessory = new this.api.platformAccessory(camera.name, uuid);
        new FoscamCameraAccessory(this, accessory, camera);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  private enforcePollInterval(camera: CameraConfig): number {
    const interval = camera.pollIntervalSeconds ?? DEFAULT_POLL_INTERVAL;
    if (interval === 0) return 0;
    if (interval < MIN_POLL_INTERVAL) {
      this.log.warn(
        `[FoscamControls] pollIntervalSeconds (${interval}) is below the ${MIN_POLL_INTERVAL}-second minimum. Using ${MIN_POLL_INTERVAL}.`,
      );
      return MIN_POLL_INTERVAL;
    }
    return interval;
  }
}
