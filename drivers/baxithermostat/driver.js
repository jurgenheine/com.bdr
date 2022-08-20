'use strict';

const BdrDriver = require('../bdrdriver');

class BaxiDriver extends BdrDriver {
    async onInit() {
        this.init();
    }

    async onPair(session) {
        this.homey.log('start pair session');
        session.setHandler("start_pair", async (data) => {
            this.homey.log(`start pairing for ${data.username} and code ${data.pairingcode}`);
            let capabilities = [];
            let capabilitiesOptions = {};
            let settings = {
                username: data.username,
                password: data.password,
                pairingcode: data.pairingcode
            };

            await this.login(data.username, data.password, 'baxi');
            const token = await this.pair(data.username, data.password, data.pairingcode, 'baxi');
            let store = {
                token: token
            };
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
                capabilities.push("thermostat_waterpressure");
            }
            if (bdr_capabilities?.system?.flowTemperatureUri != null) { //operating mode support
                capabilities.push("measure_temperature.flow");
                capabilitiesOptions["measure_temperature.flow"] = { 'title': { 'en': "Water temperature", 'nl': "Water temperatuur" } };
            }

            return { name: "Baxi_" + data.pairingcode, store: store, settings: settings, capabilities: capabilities, capabilitiesOptions: capabilitiesOptions, data: { id: token } };
        });
        await session.showView("login");
    }
}

module.exports = BaxiDriver;