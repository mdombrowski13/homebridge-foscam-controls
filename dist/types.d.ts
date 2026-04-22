export interface PluginConfig {
    platform: "FoscamControls";
    name: string;
    cameras: CameraConfig[];
}
export interface CameraConfig {
    name: string;
    host: string;
    port: number;
    username: string;
    password: string;
    pollIntervalSeconds: number;
    modules: ModuleConfig;
}
export interface ModuleConfig {
    spotlight?: boolean;
    security?: boolean;
    motion?: boolean;
    irLed?: boolean;
}
export interface FoscamCommandResult {
    result: number;
    enable?: boolean;
    status?: boolean;
    brightness?: number;
    lightInterval?: number;
}
export interface ModuleState {
    lastSynced: string;
    reachable: boolean;
}
export interface LightingState extends ModuleState {
    isOn: boolean;
    brightness: number;
    lightInterval: number;
}
