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

    async async_update_all() {
        await this.update_temperatures_loop();
        await this.update_water_temperature_loop();
        await this.update_water_pressure_loop();

        //below for status
        await this.get_consumptions();
        await this.get_errors();
        await this.get_device_information();
    }

    async update_temperatures_loop() {
        await this.async_update_temperatures();
        let interval_temperature = this.getSetting("interval_temperature");
        this.homey.setTimeout(async () => await this.update_temperatures_loop(), interval_temperature * 60 * 1000);
    }

    async update_water_temperature_loop() {
        await this.async_update_water_temperature();
        let interval_flowtemp = this.getSetting("interval_flowtemp");
        this.homey.setTimeout(async () => await this.update_water_temperature_loop(), interval_flowtemp * 60 * 1000);
    }

    async update_water_pressure_loop() {
        await this.async_update_water_pressure();
        let interval_pressure = this.getSetting("interval_pressure");
        this.homey.setTimeout(async () => await this.update_water_pressure_loop(), interval_pressure * 60 * 60 * 1000);
    }
}

module.exports = RemehaDevice;