'use strict';

const BdrDevice = require('../bdrdevice');

const CAPABILITIES_SET_DEBOUNCE = 1000;

class BaxiDevice extends BdrDevice {

    async onInit() {
        await this.initDevice(this.getData().id);
        this.registerMultipleCapabilityListener(this.getCapabilities(), async (values, options) => { return await this._onMultipleCapabilityListener(values, options); }, CAPABILITIES_SET_DEBOUNCE);
        this.homey.log(`Baxi thermostat ${this.getName()} has been initialized`);
        await this.async_update_all();
    }

    async _onMultipleCapabilityListener(valueObj, optsObj) {
        this.log("Baxi thermostat capabilities changed by Homey: " + JSON.stringify(valueObj));
        try {
            if (valueObj.target_temperature != null) {
                await this.async_set_temperature(valueObj.target_temperature);
            }
            if (valueObj.thermostat_mode != null) {
                await this.async_set_hvac_mode(valueObj.thermostat_mode);
            }
            if (valueObj.thermostat_program != null) {
                await this.async_set_preset_mode(valueObj.thermostat_program);
            }
        } catch (ex) {
            this.homey.error(ex);
        }
    }
}

module.exports = BaxiDevice;