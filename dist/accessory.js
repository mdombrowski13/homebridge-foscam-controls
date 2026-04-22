"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FoscamCameraAccessory = void 0;
const api_client_1 = require("./api-client");
const lighting_1 = require("./modules/lighting");
class FoscamCameraAccessory {
    constructor(platform, accessory, config) {
        this.platform = platform;
        this.accessory = accessory;
        this.config = config;
        this.modules = [];
        this.apiClient = new api_client_1.FoscamApiClient(config, platform.log);
        const info = this.accessory.getService(this.platform.api.hap.Service.AccessoryInformation);
        if (info) {
            info
                .setCharacteristic(this.platform.api.hap.Characteristic.Manufacturer, 'Foscam')
                .setCharacteristic(this.platform.api.hap.Characteristic.Model, 'IP Camera')
                .setCharacteristic(this.platform.api.hap.Characteristic.SerialNumber, `${config.host}:${config.port}`);
        }
        // spotlight defaults to true if not explicitly set to false
        if (config.modules?.spotlight !== false) {
            const lighting = new lighting_1.LightingModule(this.accessory, this.config, this.apiClient, this.platform.log, this.platform.api);
            this.modules.push(lighting);
            lighting.startPolling();
        }
    }
}
exports.FoscamCameraAccessory = FoscamCameraAccessory;
