'use strict';

const BdrDevice = require('../bdrdevice');

const CAPABILITIES_SET_DEBOUNCE = 1000;

class DeDietrichDevice extends BdrDevice {

    async onInit() {
        await this.initDevice(this.getData().id);
        this.registerMultipleCapabilityListener(this.getCapabilities(), async (values, options) => { return await this._onMultipleCapabilityListener(values, options); }, CAPABILITIES_SET_DEBOUNCE);
        this.homey.log(`De Dietrich thermostat ${this.getName()} has been initialized`);
        await this.async_update_all();
    }

    async _onMultipleCapabilityListener(valueObj, optsObj) {
        this.log("De Dietrich thermostat capabilities changed by Homey: " + JSON.stringify(valueObj));
        try {
            "target_temperature", "measure_temperature", "measure_pressure", "meter_power", "thermostat_mode", "thermostat_program"
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

module.exports = DeDietrichDevice;