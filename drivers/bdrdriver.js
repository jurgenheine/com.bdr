const axios = require('axios').default;
const Homey = require('homey');

class BdrDriver extends Homey.Driver {
    init(brand) {
        this.brand=brand;
        this.base_url = "https://ruapi.remoteapp.bdrthermea.com/v1.0";
        this.base_header = {
            "Accept": "application/json, text/plain, */*",
            "Connection": "keep-alive",
            "X-Requested-With": "com.bdrthermea.roomunitapplication."+brand,
            "Content-Type": "application/json;charset=UTF-8",
            "Sec-Fetch-Site": "cross-site",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Accept-Encoding": "gzip, deflate",
            "Authorization": "Basic cnVhcHA6V25AW1tjJF1QfjghM2AoW35BZiUnSDI/bEh3XWNpaXE6cn1MT3pqTGsueTVNSCtfcT0="
        };
        this.endpoints = {
            pair: this.base_url + "/pairings",
            connection: this.base_url + "/system/gateway/connection",
            capabilities: this.base_url + "/capabilities"
        };
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

            await this.login(data.username, data.password);
            const token = await this.pair(data.username, data.password, data.pairingcode);
            let store = {
                token: token
            };
            const bdr_capabilities = await this.load_capabilities(token);

            capabilities.push("target_temperature");
            capabilities.push("measure_temperature");
            capabilities.push("thermostat_program");

            if (bdr_capabilities?.system?.outsideTemperatureConditionsUri != null) { //outside temperature meter support
                capabilities.push("measure_temperature.outside");
                capabilitiesOptions["measure_temperature.outside"] = { 'title': { 'en': "Outside temperature", 'nl': "Buiten temperatuur" } };
            }
            if (bdr_capabilities?.system?.operatingModeUri != null) { //operating mode support
                capabilities.push("thermostat_mode");
            }
            if (bdr_capabilities?.system?.energyConsumptionUri != null) { //energie consumption
                capabilities.push("meter_power");
            }
            if (bdr_capabilities?.system?.waterPressureUri != null) { //water pressure support
                capabilities.push("thermostat_waterpressure");
            }
            if (bdr_capabilities?.system?.flowTemperatureUri != null) { //flow temperature support
                capabilities.push("measure_temperature.flow");
                capabilitiesOptions["measure_temperature.flow"] = { 'title': { 'en': "Water temperature", 'nl': "Water temperatuur" } };
            }

            return { name: this.brand + "_" + data.pairingcode, store: store, settings: settings, capabilities: capabilities, capabilitiesOptions: capabilitiesOptions, data: { id: token } };
        });
        await session.showView("login");
    }

    copyObject(value) {
        return JSON.parse(JSON.stringify(value));
    }

    async login(username, password) {
        var brand =this.brand.toLowerCase();
        var api_endpoint = `https://remoteapp.bdrthermea.com/user/${brand}/login`;

        var payload = {
            "username": username,
            "password": password
        }

        var response = await this.async_post_request(api_endpoint, payload);
        if (response == null) {
            throw 'ERROR logging to BDR. Perhaps wrong password??';
        }
    }

    async pair(username, password, pairingcode) {
        var brand =this.brand.toLowerCase();
        var id = await this.homey.cloud.getHomeyId();
        var device = `Homey_${id}`;
        var api_endpoint = this.endpoints.pair;
        var payload = {
            "account": username,
            "brand": brand,
            "password": password,
            "device": device,
            "otp": pairingcode
        }

        var response = await this.async_post_request(api_endpoint, payload);

        if (response == null) {
            throw new Error('Error pairing integration with BDR');
        }

        return response.token;
    }

    async sync_request(method, url, headers, data) {
        if (url == null)
            return null;

        this.homey.log(`BDR API request: method = ${method}, url = ${url}, headers = ${JSON.stringify(headers)}, data = ${JSON.stringify(data)}`);

        try {
            let response = await axios({
                url: url,
                method: method,
                headers: headers,
                data: data
            });

            if (response == null)
                return null;

            if (response.status < 200 && response.status >= 300) {
                this.homey.log(`ERROR with ${method} request to ${url}: ${response.statusText}`);
                return null;
            }
            this.homey.log(`BDR API response: ${JSON.stringify(response.data)}`);
            return response.data;
        }
        catch (e) {
            this.homey.error(`EXCEPTION with ${method} request to ${url}: ${e}`);
            throw e;
        }
    }

    async async_post_request(endpoint, payload) {
        return await this.sync_request("post", endpoint, this.base_header, payload);
    }

    async async_put_request(endpoint, token, payload) {
        var headers = this.copyObject(this.base_header);
        headers["X-Bdr-Pairing-Token"] = token;

        return await this.sync_request("put", endpoint, headers, payload);
    }

    async async_get_request(endpoint, token) {
        var headers = this.copyObject(this.base_header);
        headers["X-Bdr-Pairing-Token"] = token;

        return await this.sync_request("get", endpoint, headers);
    }

    async connection_status(token) {
        const api_endpoint = this.endpoints.connection;

        response = await this.async_get_request(api_endpoint, token);

        return (response != null && response.statusMessage === "connected_to_appliance")
    }

    async load_capabilities(token) {
        var capabilities = {}
        var api_endpoint = this.endpoints.capabilities;

        var capabilitiesToParse = await this.async_get_request(api_endpoint, token);
        
        for (var capability in capabilitiesToParse) {
            capabilities[capability] = {};
            if (Array.isArray(capabilitiesToParse[capability])) {
                for (var functionname in capabilitiesToParse[capability][0]) {
                    if (functionname.toLowerCase().indexOf('uri') !== -1) {
                        capabilities[capability][functionname] = this.base_url + capabilitiesToParse[capability][0][functionname];
                    } else {
                        capabilities[capability][functionname] = capabilitiesToParse[capability][0][functionname];
                    }
                }
            } else {
                for (var functionname in capabilitiesToParse[capability]) {
                    if (functionname.toLowerCase().indexOf('uri') !== -1) {
                        capabilities[capability][functionname] = this.base_url + capabilitiesToParse[capability][functionname];
                    } else {
                        capabilities[capability][functionname] = capabilitiesToParse[capability][functionname];
                    }
                }
            }
        }

        return capabilities;
    }
}

module.exports = BdrDriver;