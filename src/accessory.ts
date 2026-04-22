import { PlatformAccessory } from 'homebridge';
import { FoscamApiClient } from './api-client';
import { LightingModule } from './modules/lighting';
import { FoscamControlsPlatform } from './platform';
import { CameraConfig } from './types';

export class FoscamCameraAccessory {
  private readonly apiClient: FoscamApiClient;
  private readonly modules: Array<{ stopPolling(): void }> = [];

  constructor(
    private readonly platform: FoscamControlsPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly config: CameraConfig,
  ) {
    this.apiClient = new FoscamApiClient(config, platform.log);

    const info = this.accessory.getService(this.platform.api.hap.Service.AccessoryInformation);
    if (info) {
      info
        .setCharacteristic(this.platform.api.hap.Characteristic.Manufacturer, 'Foscam')
        .setCharacteristic(this.platform.api.hap.Characteristic.Model, 'IP Camera')
        .setCharacteristic(
          this.platform.api.hap.Characteristic.SerialNumber,
          `${config.host}:${config.port}`,
        );
    }

    // spotlight defaults to true if not explicitly set to false
    if (config.modules?.spotlight !== false) {
      const lighting = new LightingModule(
        this.accessory,
        this.config,
        this.apiClient,
        this.platform.log,
        this.platform.api,
      );
      this.modules.push(lighting);
      lighting.startPolling();
    }
  }
}
