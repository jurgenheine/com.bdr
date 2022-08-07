const axios = require('axios').default;
const Homey = require('homey');

class BdrDriver extends Homey.Driver {
    init() {
        this.base_url = "https://ruapi.remoteapp.bdrthermea.com/v1.0";
        this.base_header = {
            "Accept": "application/json, text/plain, */*",
            "Connection": "keep-alive",
            "X-Requested-With": "com.bdrthermea.roomunitapplication.baxi",
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

    copyObject(value){
        return JSON.parse(JSON.stringify(value));
    }
    
    async login(username, password, brand) {
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

    async pair(username, password, pairingcode, brand) {
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
            
            if (response.status >= 200 && response.status < 300) {
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
        var headers = copyObject(this.base_header);
        headers["X-Bdr-Pairing-Token"] = token;

        return await this.sync_request("put", endpoint, headers, payload);
    }

    async async_get_request(endpoint, token) {
        var headers = copyObject(this.base_header);
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

        for (let capability of capabilitiesToParse) {
            if (Array.isArray(capability.subsystem)) {
                if (len(capability.subsystem) > 0) {
                    capability.subsystem = capability.subsystem[0];
                }
                else
                    continue;
            }
            capabilities[capability.subsystem_name] = {};
            for (let subsystem of capability.subsystem) {
                capabilities[capability.subsystem_name][subsystem.function] = this.base_url + subsystem.uri;
            }
        }

        return capabilities;
    }
}

module.exports = BdrDriver;