import { PlatformAccessory } from 'homebridge';
import { FoscamControlsPlatform } from './platform';
import { CameraConfig } from './types';
export declare class FoscamCameraAccessory {
    private readonly platform;
    private readonly accessory;
    private readonly config;
    private readonly apiClient;
    private readonly modules;
    constructor(platform: FoscamControlsPlatform, accessory: PlatformAccessory, config: CameraConfig);
}
