"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FoscamControlsPlatform = void 0;
const constants_1 = require("./constants");
const accessory_1 = require("./accessory");
const MIN_POLL_INTERVAL = 10;
const DEFAULT_POLL_INTERVAL = 0;
class FoscamControlsPlatform {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.accessories = [];
        this.api.on('didFinishLaunching', () => { this.discoverDevices(); });
    }
    configureAccessory(accessory) {
        this.accessories.push(accessory);
    }
    discoverDevices() {
        const pluginConfig = this.config;
        const cameras = pluginConfig.cameras ?? [];
        for (const camera of cameras) {
            camera.pollIntervalSeconds = this.enforcePollInterval(camera);
            const uuid = this.api.hap.uuid.generate(`${camera.host}:${camera.port}`);
            const existing = this.accessories.find(a => a.UUID === uuid);
            if (existing) {
                this.log.info(`Restoring cached accessory: ${existing.displayName}`);
                new accessory_1.FoscamCameraAccessory(this, existing, camera);
            }
            else {
                this.log.info(`Registering new accessory: ${camera.name}`);
                const accessory = new this.api.platformAccessory(camera.name, uuid);
                new accessory_1.FoscamCameraAccessory(this, accessory, camera);
                this.api.registerPlatformAccessories(constants_1.PLUGIN_NAME, constants_1.PLATFORM_NAME, [accessory]);
            }
        }
    }
    enforcePollInterval(camera) {
        const interval = camera.pollIntervalSeconds ?? DEFAULT_POLL_INTERVAL;
        if (interval === 0)
            return 0;
        if (interval < MIN_POLL_INTERVAL) {
            this.log.warn(`[FoscamControls] pollIntervalSeconds (${interval}) is below the ${MIN_POLL_INTERVAL}-second minimum. Using ${MIN_POLL_INTERVAL}.`);
            return MIN_POLL_INTERVAL;
        }
        return interval;
    }
}
exports.FoscamControlsPlatform = FoscamControlsPlatform;
