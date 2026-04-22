import { API, CharacteristicValue, Logger, PlatformAccessory, Service } from 'homebridge';
import { FoscamApiClient, FoscamCommandError } from '../api-client';
import { StateManager } from '../state-manager';
import { CameraConfig, LightingState } from '../types';

export type SpotlightApiVariant = 'brightness' | 'status';

interface SpotlightState {
  isOn: boolean;
  brightness: number;
  lightInterval: number;
}

export class LightingModule {
  private readonly service: Service;
  private readonly stateManager: StateManager<LightingState>;
  private pollTimer?: ReturnType<typeof setInterval>;
  private apiVariant: SpotlightApiVariant = 'brightness';
  private variantDetected = false;

  constructor(
    private readonly accessory: PlatformAccessory,
    private readonly config: CameraConfig,
    private readonly apiClient: FoscamApiClient,
    private readonly log: Logger,
    private readonly api: API,
  ) {
    this.stateManager = new StateManager<LightingState>();

    this.service =
      this.accessory.getService(this.api.hap.Service.Lightbulb) ??
      this.accessory.addService(this.api.hap.Service.Lightbulb, this.config.name);

    this.service
      .getCharacteristic(this.api.hap.Characteristic.On)
      .onGet(this.handleGet.bind(this))
      .onSet(this.handleSet.bind(this));
  }

  startPolling(): void {
    if (this.config.pollIntervalSeconds === 0) return;
    void this.syncState();
    this.pollTimer = setInterval(
      () => { void this.syncState(); },
      this.config.pollIntervalSeconds * 1_000,
    );
  }

  stopPolling(): void {
    if (this.pollTimer !== undefined) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private async handleGet(): Promise<CharacteristicValue> {
    try {
      const { isOn, brightness, lightInterval } = await this.getSpotlightState();
      this.stateManager.setState({ isOn, brightness, lightInterval, reachable: true });
      return isOn;
    } catch (err) {
      this.log.warn(`[${this.config.name}] Get failed: ${(err as Error).message}`);
      return this.stateManager.getState()?.isOn ?? false;
    }
  }

  private async handleSet(value: CharacteristicValue): Promise<void> {
    const on = value as boolean;
    const cached = this.stateManager.getState();
    const brightness = cached?.brightness ?? 100;
    const lightInterval = cached?.lightInterval ?? 60;

    try {
      await this.setSpotlightState(on, brightness, lightInterval);
      this.stateManager.setState({ isOn: on, brightness, lightInterval, reachable: true });
      this.log.info(`[${this.config.name}] Spotlight ${on ? 'on' : 'off'}`);
    } catch (err) {
      this.log.warn(`[${this.config.name}] Set failed: ${(err as Error).message}`);
      const previousOn = cached?.isOn ?? !on;
      // Defer revert to next microtask so it runs after the onSet handler returns
      void Promise.resolve().then(() => {
        this.service
          .getCharacteristic(this.api.hap.Characteristic.On)
          .updateValue(previousOn);
      });
      throw new Error('Communication failure');
    }
  }

  private async syncState(): Promise<void> {
    try {
      const { isOn, brightness, lightInterval } = await this.getSpotlightState();
      const onChanged = this.stateManager.isChanged({ isOn });

      this.stateManager.setState({ isOn, brightness, lightInterval, reachable: true });

      if (onChanged) {
        this.log.debug(`[${this.config.name}] Spotlight synced: ${isOn ? 'on' : 'off'}`);
        this.service.getCharacteristic(this.api.hap.Characteristic.On).updateValue(isOn);
      }
    } catch (err) {
      this.log.warn(`[${this.config.name}] Poll failed: ${(err as Error).message}`);
      const cached = this.stateManager.getState();
      if (cached) {
        this.stateManager.setState({
          isOn: cached.isOn,
          brightness: cached.brightness,
          lightInterval: cached.lightInterval,
          reachable: false,
        });
      }
    }
  }

  private async getSpotlightState(): Promise<SpotlightState> {
    if (this.variantDetected) {
      return this.fetchState(this.apiVariant);
    }
    return this.detectAndFetchState();
  }

  private async detectAndFetchState(): Promise<SpotlightState> {
    try {
      const state = await this.fetchState('brightness');
      this.apiVariant = 'brightness';
      this.variantDetected = true;
      this.log.info(`[${this.config.name}] Using brightness API (getWhiteLightBrightness)`);
      return state;
    } catch (err) {
      if (err instanceof FoscamCommandError) {
        this.log.warn(
          `[${this.config.name}] Brightness API returned error ${err.code} — trying status API (getWhiteLightStatus)`,
        );
        const state = await this.fetchState('status');
        this.apiVariant = 'status';
        this.variantDetected = true;
        this.log.info(`[${this.config.name}] Using status API (getWhiteLightStatus)`);
        return state;
      }
      throw err;
    }
  }

  private async fetchState(variant: SpotlightApiVariant): Promise<SpotlightState> {
    const cached = this.stateManager.getState();
    if (variant === 'brightness') {
      const result = await this.apiClient.sendCommand('getWhiteLightBrightness');
      return {
        isOn: result.enable ?? false,
        brightness: result.brightness ?? cached?.brightness ?? 100,
        lightInterval: result.lightInterval ?? cached?.lightInterval ?? 60,
      };
    } else {
      const result = await this.apiClient.sendCommand('getWhiteLightStatus');
      return {
        isOn: result.status ?? false,
        brightness: cached?.brightness ?? 100,
        lightInterval: cached?.lightInterval ?? 60,
      };
    }
  }

  private async setSpotlightState(on: boolean, brightness: number, lightInterval: number): Promise<void> {
    if (this.apiVariant === 'brightness') {
      await this.apiClient.sendCommand('setWhiteLightBrightness', {
        enable: on ? 1 : 0,
        brightness,
        lightinterval: lightInterval,
      });
    } else {
      await this.apiClient.sendCommand('setWhiteLightStatus', { status: on ? 1 : 0 });
    }
  }
}
