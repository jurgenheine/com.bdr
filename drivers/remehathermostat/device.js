'use strict';

const BdrDevice = require('../bdrdevice');

const CAPABILITIES_SET_DEBOUNCE = 1000;

class RemehaDevice extends BdrDevice {

    async onInit() {
        await this.initDevice(this.getData().id);
        this.registerMultipleCapabilityListener(capabilities, async (values, options) => { return this._onMultipleCapabilityListener(values, options); }, CAPABILITIES_SET_DEBOUNCE);
        this.homey.log(`Remeha thermostat ${this.getName()} has been initialized`);
        await this.async_update_all();
    }

    _onMultipleCapabilityListener(valueObj, optsObj) {
        this.log("Remeha thermostat capabilities changed by Homey: " + JSON.stringify(valueObj));
        try {
            "target_temperature","measure_temperature","measure_pressure","meter_power","thermostat_mode","thermostat_program"
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

    async async_update_all() {
        await this.update_temperatures_loop();
        await this.update_water_pressure_loop();
        await this.update_water_temperature_loop();
        //todo, map errors and power consumption
        await this.get_consumptions();
        await this.get_errors();
    }

    async update_temperatures_loop() {
        await this.async_update_temperatures();
        let settings = this.getSettings();
        this.homey.setTimeout(this.update_temperatures_loop, settings.interval_temperature * 60 * 1000);
    }

    async update_water_pressure_loop() {
        await this.async_update_water_pressure();
        let settings = this.getSettings();
        this.homey.setTimeout(this.update_water_pressure_loop, settings.interval_pressure * 60 * 60 * 1000);
    }

    async update_water_temperature_loop() {
        await this.async_update_water_temperature();
        let settings = this.getSettings();
        this.homey.setTimeout(this.update_water_temperature_loop, settings.interval_flowtemp * 60 * 1000);
    }
}

module.exports = RemehaDevice;