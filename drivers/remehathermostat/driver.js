'use strict';

const BdrDriver = require('../bdrdriver');

class RemahaDriver extends BdrDriver {
    async onPair(session) {
        await session.showView("login");

        session.setHandler("start_pair", async function (data) {
            let capabilities = [];
            let capabilitiesOptions = {};
            let settings = {
                username: data.username,
                password: data.password
            };
            await this.login(data.username, data.password, 'remeha');
            const token = await this.pair(data.username, data.password, data.pairingcode, 'remeha');
            const bdr_capabilities = await this.load_capabilities(token);
            let status = await this.async_get_request(bdr_capabilities.centralHeatingZones?.statusUri, token);

            capabilities.push("target_temperature");
            capabilities.push("measure_temperature");
            capabilities.push("thermostat_program");

            if (status.outsideTemperature != null) { //outside temp meter
                capabilities.push("measure_temperature.outside");
                capabilitiesOptions["measure_temperature.outside"] = { 'title': { 'en': "Outside temperature", 'nl': "Buiten temperatuur" } };
            }
            if (bdr_capabilities?.system?.operatingModeUri != null) { //operating mode support
                capabilities.push("thermostat_mode");
            }
            if (bdr_capabilities?.system?.energyConsumptionUri != null) { //energie consumption
                capabilities.push("meter_power");
            }
            if (bdr_capabilities?.system?.waterPressureUri != null) { //operating mode support
                capabilities.push("measure_pressure");
            }
            if (bdr_capabilities?.system?.flowTemperatureUri != null) { //operating mode support
                capabilities.push("measure_temperature.flow");
                capabilitiesOptions["measure_temperature.flow"] = { 'title': { 'en': "Water temperature", 'nl': "Water temperatuur" } };
            }

            return { name: "Remeha_" + pairingcode, settings: settings, capabilities: capabilities, capabilitiesOptions: capabilitiesOptions, data: { id: token } };
        });
    }
}

module.exports = RemahaDriver;