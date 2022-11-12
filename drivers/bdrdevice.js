'use strict';

const Homey = require('homey');

class BdrDevice extends Homey.Device {
    async initDevice(id) {
        this.token = id;
        this.capabilities = {};
        await this.load_capabilities();
    }

    async load_capabilities() {
        this.capabilities = await this.driver.load_capabilities(this.token);
    }

    async get_device_information() {
        var api_endpoint = this.capabilities.system?.deviceInformationUri;
        return await this.driver.async_get_request(api_endpoint, this.token);
    }

    async get_operating_mode() {
        var api_endpoint = this.capabilities.system?.operatingModeUri;
        return await this.driver.async_get_request(api_endpoint, this.token);
    }

    async get_preset_mode() {
        var api_endpoint = this.capabilities.centralHeatingZones?.getSetpointUri;
        return await this.driver.async_get_request(api_endpoint, this.token);
    }

    async get_status() {
        var api_endpoint = this.capabilities.centralHeatingZones?.statusUri;
        if(api_endpoint==null){
            api_endpoint = this.capabilities.centralHeatingZones?.uri + "/status"
        }  
        return await this.driver.async_get_request(api_endpoint, this.token);
    }

    async set_target_temperature(target_temp) {
        var api_endpoint = this.capabilities.centralHeatingZones?.putSetpointManualUri;
        var payload = { roomTemperatureSetpoint: target_temp };
        return await this.driver.async_put_request(api_endpoint, this.token, payload);
    }

    async set_override_temperature(target_temp, override_end) {
        var api_endpoint = this.capabilities.centralHeatingZones?.putSetpointTemporaryOverrideUri;
        var payload = { roomTemperatureSetpoint: target_temp, temporaryOverrideEnd: override_end };
        return await this.driver.async_put_request(api_endpoint, this.token, payload);
    }

    async set_schedule(schedule_program) {
        var api_endpoint = this.capabilities.centralHeatingZones?.putSetpointScheduleUri;
        var payload = { currentHeatingTimeProgram: schedule_program };
        return await this.driver.async_put_request(api_endpoint, this.token, payload);
    }

    async set_operating_mode(mode) {
        var api_endpoint = this.capabilities.system?.operatingModeUri;
        var payload = { mode: mode };
        return await this.driver.async_put_request(api_endpoint, this.token, payload);
    }

    async set_program_mode(program) {
        var api_endpoint = null;
        switch (program) {
            case "manual":
                api_endpoint = this.capabilities.centralHeatingZones?.putSetpointManualUri;
                break;
            case "anti-frost":
                api_endpoint = this.capabilities.centralHeatingZones?.putSetpointAntiFrostUri;
                break;
            case "holiday":
                api_endpoint = this.capabilities.centralHeatingZones?.putSetpointHolidayUri;
                break;
        }
        return await this.driver.async_put_request(api_endpoint, this.token);
    }

    async get_consumptions() {
        var api_endpoint = this.capabilities.producers?.energyConsumptionUri;
        return await this.driver.async_get_request(api_endpoint, this.token);
    }

    async get_water_pressure() {
        var api_endpoint = this.capabilities.system?.waterPressureUri;
        return await this.driver.async_get_request(api_endpoint, this.token);
    }

    async get_errors() {
        var api_endpoint = this.capabilities.system?.errorStatusUri;
        return await this.driver.async_get_request(api_endpoint, this.token);
    }

    async get_flow_temperature() {
        var api_endpoint = this.capabilities.system?.flowTemperatureUri;
        return await this.driver.async_get_request(api_endpoint, this.token);
    }

    async async_update_temperatures() {
        const status = await this.get_status();

        if (status != null) {
            this.current_temperature = status.roomTemperature.value;
            this.setCapabilityValue('measure_temperature', this.current_temperature).catch(this.error);
            this.temperature_unit = status.roomTemperature.unit;
            this.target_temperature = status.roomTemperatureSetpoint.value;
            this.setCapabilityValue('target_temperature', this.target_temperature).catch(this.error);
            this.preset_mode = this.preset_mode_bdr_to_homey(status.mode, status.timeProgram);
            this.setCapabilityValue('thermostat_program', this.preset_mode).catch(this.error);

            if (status.outsideTemperature != null) {
                this.outside_temperature_value = status.outsideTemperature.value;
                this.outside_temperature_unit = status.outsideTemperature.unit;
                this.setCapabilityValue('measure_temperature.outside', this.outside_temperature_value).catch(this.error);
            }
            this.zone_activity = status.zoneActivity;

            const next_switch = status.nextSwitch;
            if (next_switch != null) {
                this.next_change = next_switch.time;

                this.next_temp = next_switch.roomTemperatureSetpoint.value;
                this.next_switch_days = next_switch.dayOffset;  //we just need to store this
            }
            else {
                this.next_change = null;
                this.next_temp = null;
            }
        }

        const operating_mode = await this.get_operating_mode();

        if (operating_mode != null) {
            this.hvac_mode = this.hvac_mode_bdr_to_homey(operating_mode.mode);
            this.setCapabilityValue('thermostat_mode', this.hvac_mode).catch(this.error);
        }
    }

    async async_update_water_pressure() {
        const water_pressure = await this.get_water_pressure();
        if (water_pressure != null && water_pressure.waterPressure != null) {
            this.water_pressure_value = water_pressure.waterPressure.value;
            this.setCapabilityValue('thermostat_waterpressure', this.water_pressure_value).catch(this.error);
            this.water_pressure_unit = water_pressure.waterPressure.unit;
        }
        else {
            this.water_pressure_value = "N/A"
            this.water_pressure_unit = ""
        }
    }

    async async_update_water_temperature() {
        const water_temperature = await this.get_flow_temperature();
        if (water_temperature) {
            this.water_temperature_value = water_temperature.systemFlowTemperature;
            this.setCapabilityValue('measure_temperature.flow', this.water_temperature_value).catch(this.error);
            this.water_temperature_unit = water_temperature.unit;
        }
        else {
            this.water_temperature_value = "N/A";
            this.water_temperature_unit = "";
        }
    }

    async async_update_erros() {
        const err = await this.get_errors();
        if (err != null) {
            this.error_value = err["status"];
        }
        else {
            this.error_value = "";
        }
    }

    async async_set_temperature(temperature) {
        //"""Set new target temperature."""
        if (temperature == null) {
            return;
        }

        if (this.next_change != null) {
            // We are in scheduled mode, need to create a temporary override
            const override_date = this.create_override_date(this.next_change, this.next_switch_days);
            await this.set_override_temperature(temperature, override_date);
        }
        else {
            // Manual mode, it is fine to modify the temp
            await this.set_target_temperature(temperature);
        }
    }

    async async_set_hvac_mode(hvac_mode) {
        const target_bdr_mode = this.hvac_mode_homey_to_bdr(hvac_mode);
        await this.set_operating_mode(target_bdr_mode);
    }

    async async_set_preset_mode(preset_mode) {
        const [bdr_preset_mode, program] = this.preset_mode_homey_to_bdr(preset_mode);

        this.preset_mode = preset_mode;

        // Set a schedule
        if (bdr_preset_mode == "schedule") {
            await this.set_schedule(program);
        }
        // Set a manual temperature
        else if (bdr_preset_mode == "manual") {
            await this.set_target_temperature(this.target_temperature);
        }
        else if (bdr_preset_mode == "mode") {
            await this.set_program_mode(program);
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
        let interval_temperature = this.getSetting("interval_temperature");
        this.homey.setTimeout(async () => await this.update_temperatures_loop(), interval_temperature * 60 * 1000);
        await this.async_update_temperatures();
    }

    async update_water_temperature_loop() {       
        let interval_flowtemp = this.getSetting("interval_flowtemp");
        this.homey.setTimeout(async () => await this.update_water_temperature_loop(), interval_flowtemp * 60 * 1000);
        await this.async_update_water_temperature();
    }

    async update_water_pressure_loop() {
        let interval_pressure = this.getSetting("interval_pressure");
        this.homey.setTimeout(async () => await this.update_water_pressure_loop(), interval_pressure * 60 * 60 * 1000);
        await this.async_update_water_pressure();
    }

    preset_mode_bdr_to_homey(bdr_mode, program = null) {

        if (bdr_mode !== "schedule")
            return bdr_mode;
        if (program === 1)
            return "schedule-1";
        if (program === 2)
            return "schedule-2";
        return "schedule-3";
    }

    preset_mode_homey_to_bdr(mode) {

        if (mode == "schedule-1") {
            return ["schedule", "1"];
        }
        if (mode == "schedule-2") {
            return ["schedule", "2"];
        }
        if (mode == "schedule-3") {
            return ["schedule", "3"];
        }
        if (mode == "holiday") {
            return ["mode", "holiday"];
        }
        if (mode == "anti-frost") {
            return ["mode", "anti-frost"];
        }
        return ["manual", "manual"];
    }

    hvac_mode_bdr_to_homey(mode) {
        if (mode == "off")
            return "off";
        if (mode == "heating-auto")
            return "auto";
        if (mode == "heating-cooling-auto")
            return "auto";
        if (mode == "forced-cooling")
            return "cool";
    }

    hvac_mode_homey_to_bdr(mode) {
        if (mode == "off")
            return "off";
        if (mode == "cool")
            return "forced-cooling";
        if (this.capabilities.centralHeatingZones?.coolingSupported == true)
            return "heating-cooling-auto";
        return "heating-auto";
    }

    create_override_date(target_time, days_offset) {
        let override_date = new Date(Date.now() + days_offset * 24 * 60 * 60 * 1000);
        target_hour = target_time.split(":")[0];
        target_minutes = target_time.split(":")[1];
        override_date.setMinutes(target_minutes);
        override_date.setHours(target_hour);
        return override_date.toISOString();
    }
}
module.exports = BdrDevice;