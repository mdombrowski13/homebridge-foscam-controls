"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LightingModule = void 0;
const api_client_1 = require("../api-client");
const state_manager_1 = require("../state-manager");
class LightingModule {
    constructor(accessory, config, apiClient, log, api) {
        this.accessory = accessory;
        this.config = config;
        this.apiClient = apiClient;
        this.log = log;
        this.api = api;
        this.apiVariant = 'brightness';
        this.variantDetected = false;
        this.stateManager = new state_manager_1.StateManager();
        this.service =
            this.accessory.getService(this.api.hap.Service.Lightbulb) ??
                this.accessory.addService(this.api.hap.Service.Lightbulb, this.config.name);
        this.service
            .getCharacteristic(this.api.hap.Characteristic.On)
            .onGet(this.handleGet.bind(this))
            .onSet(this.handleSet.bind(this));
    }
    startPolling() {
        if (this.config.pollIntervalSeconds === 0)
            return;
        void this.syncState();
        this.pollTimer = setInterval(() => { void this.syncState(); }, this.config.pollIntervalSeconds * 1000);
    }
    stopPolling() {
        if (this.pollTimer !== undefined) {
            clearInterval(this.pollTimer);
            this.pollTimer = undefined;
        }
    }
    async handleGet() {
        try {
            const { isOn, brightness, lightInterval } = await this.getSpotlightState();
            this.stateManager.setState({ isOn, brightness, lightInterval, reachable: true });
            return isOn;
        }
        catch (err) {
            this.log.warn(`[${this.config.name}] Get failed: ${err.message}`);
            return this.stateManager.getState()?.isOn ?? false;
        }
    }
    async handleSet(value) {
        const on = value;
        const cached = this.stateManager.getState();
        const brightness = cached?.brightness ?? 100;
        const lightInterval = cached?.lightInterval ?? 60;
        try {
            await this.setSpotlightState(on, brightness, lightInterval);
            this.stateManager.setState({ isOn: on, brightness, lightInterval, reachable: true });
            this.log.info(`[${this.config.name}] Spotlight ${on ? 'on' : 'off'}`);
        }
        catch (err) {
            this.log.warn(`[${this.config.name}] Set failed: ${err.message}`);
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
    async syncState() {
        try {
            const { isOn, brightness, lightInterval } = await this.getSpotlightState();
            const onChanged = this.stateManager.isChanged({ isOn });
            this.stateManager.setState({ isOn, brightness, lightInterval, reachable: true });
            if (onChanged) {
                this.log.debug(`[${this.config.name}] Spotlight synced: ${isOn ? 'on' : 'off'}`);
                this.service.getCharacteristic(this.api.hap.Characteristic.On).updateValue(isOn);
            }
        }
        catch (err) {
            this.log.warn(`[${this.config.name}] Poll failed: ${err.message}`);
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
    async getSpotlightState() {
        if (this.variantDetected) {
            return this.fetchState(this.apiVariant);
        }
        return this.detectAndFetchState();
    }
    async detectAndFetchState() {
        try {
            const state = await this.fetchState('brightness');
            this.apiVariant = 'brightness';
            this.variantDetected = true;
            this.log.info(`[${this.config.name}] Using brightness API (getWhiteLightBrightness)`);
            return state;
        }
        catch (err) {
            if (err instanceof api_client_1.FoscamCommandError) {
                this.log.warn(`[${this.config.name}] Brightness API returned error ${err.code} — trying status API (getWhiteLightStatus)`);
                const state = await this.fetchState('status');
                this.apiVariant = 'status';
                this.variantDetected = true;
                this.log.info(`[${this.config.name}] Using status API (getWhiteLightStatus)`);
                return state;
            }
            throw err;
        }
    }
    async fetchState(variant) {
        const cached = this.stateManager.getState();
        if (variant === 'brightness') {
            const result = await this.apiClient.sendCommand('getWhiteLightBrightness');
            return {
                isOn: result.enable ?? false,
                brightness: result.brightness ?? cached?.brightness ?? 100,
                lightInterval: result.lightInterval ?? cached?.lightInterval ?? 60,
            };
        }
        else {
            const result = await this.apiClient.sendCommand('getWhiteLightStatus');
            return {
                isOn: result.status ?? false,
                brightness: cached?.brightness ?? 100,
                lightInterval: cached?.lightInterval ?? 60,
            };
        }
    }
    async setSpotlightState(on, brightness, lightInterval) {
        if (this.apiVariant === 'brightness') {
            await this.apiClient.sendCommand('setWhiteLightBrightness', {
                enable: on ? 1 : 0,
                brightness,
                lightinterval: lightInterval,
            });
        }
        else {
            await this.apiClient.sendCommand('setWhiteLightStatus', { status: on ? 1 : 0 });
        }
    }
}
exports.LightingModule = LightingModule;
