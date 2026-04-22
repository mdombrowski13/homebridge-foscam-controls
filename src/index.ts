import { API } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './constants';
import { FoscamControlsPlatform } from './platform';

export = (api: API): void => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, FoscamControlsPlatform);
};
