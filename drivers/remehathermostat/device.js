'use strict';

const BdrDevice = require('../bdrdevice');

const CAPABILITIES_SET_DEBOUNCE = 1000;

class RemehaDevice extends BdrDevice {

    async onInit() {
        await this.initDevice(this.getData().id);
        await this.fixCapabilities();
        this.registerMultipleCapabilityListener(this.getCapabilities(), async (values, options) => { return await this._onMultipleCapabilityListener(values, options); }, CAPABILITIES_SET_DEBOUNCE);
        this.homey.log(`Remeha thermostat ${this.getName()} has been initialized`);
        await this.async_update_all();
    }

    async fixCapabilities() {
        if (this.hasCapability("measure_pressure")) {
            this.homey.log("change capabality measure_pressure to thermostat_waterpressure");
            await this.removeCapability("measure_pressure");
            await this.addCapability("thermostat_waterpressure");
        }
        if (this.hasCapability("meter_power")) {
            this.homey.log("Remove capablity meter_power");
            await this.removeCapability("meter_power");
        }
    }

    async _onMultipleCapabilityListener(valueObj, optsObj) {
        this.log("Remeha thermostat capabilities changed by Homey: " + JSON.stringify(valueObj));
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

module.exports = RemehaDevice;