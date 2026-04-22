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
  spotlight?: boolean;   // v1.0
  security?: boolean;    // planned
  motion?: boolean;      // planned
  irLed?: boolean;       // planned
}

export interface FoscamCommandResult {
  result: number;          // 0 = success; non-zero = camera error code
  enable?: boolean;        // brightness variant GET: <enable>
  status?: boolean;        // status variant GET: <status> (legacy firmware)
  brightness?: number;     // brightness variant GET: <brightness>
  lightInterval?: number;  // brightness variant GET: <lightinterval>
}

export interface ModuleState {
  lastSynced: string;   // ISO timestamp of last successful poll
  reachable: boolean;
}

export interface LightingState extends ModuleState {
  isOn: boolean;
  brightness: number;    // 0-100; preserved and passed back on every set
  lightInterval: number; // seconds; preserved and passed back on every set
}
