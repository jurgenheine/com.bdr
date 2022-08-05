const Homey = require('homey');

class BdrDriver extends Homey.Driver {
    base_url = "https://ruapi.remoteapp.bdrthermea.com/v1.0"
    base_header = {
        "Accept": "application/json, text/plain, */*",
        "Connection": "keep-alive",
        "X-Requested-With": "com.bdrthermea.roomunitapplication.baxi",
        "Content-Type": "application/json;charset=UTF-8",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
        "Accept-Encoding": "gzip, deflate",
        "Authorization": "Basic cnVhcHA6V25AW1tjJF1QfjghM2AoW35BZiUnSDI/bEh3XWNpaXE6cn1MT3pqTGsueTVNSCtfcT0=",
    }
    endpoints = {
        pair: base_url + "/pairings",
        connection: base_url + "/system/gateway/connection",
        capabilities: base_url + "/capabilities",
    }

    async login(username, password, brand) {
        var api_endpoint = `https://remoteapp.bdrthermea.com/user/${brand}/login`;

        var payload = {
            "username": username,
            "password": password
        }

        var response = await async_post_request(api_endpoint, payload);
        if (response == null) {
            throw 'ERROR logging to BDR. Perhaps wrong password??';
        }
    }

    async pair(username, password, pairingcode, brand) {
        var id = this.homey.cloud.getHomeyId();
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
            throw 'Error pairing integration with BDR';
        }
        var token = response.json().token;
        return token;
    }

    async sync_request(method, url, headers, payload) {
        if (url == null)
            return null;

        this.log(`BDR API request: method = ${method}, url = ${url}, headers = ${JSON.stringify(headers)}, payload = ${JSON.stringify(payload)}`);
        try {
            var response = null;
            if (method == "get") {
                response = await got.get(url, { headers: headers }).json();
            }
            else if (method == "put") {
                response = await got.put(url, { json: payload, headers: headers }).json();
            }
            else if (method == "post") {
                response = await got.post(url, { json: payload, headers: headers }).json();
            }
            if (response == null)
                return null;

            this.log(`BDR API response: ${response}`);

            if (response.statusCode != 200) {
                this.error(`ERROR with ${method} request to ${url}: ${response.statusCode}`);
                return null;
            }
            return response;
        }
        catch (e) {
            this.error(`EXCEPTION with ${method} request to ${url}: ${e}`);
            throw e;
        }
    }

    async async_post_request(endpoint, payload, headers = this.base_header) {
        return await this.sync_request("post", endpoint, headers, payload);
    }

    async async_put_request(endpoint, token, payload, headers = this.base_header) {
        var headers = headers.copy();
        headers["X-Bdr-Pairing-Token"] = token;

        return await this.sync_request("put", endpoint, headers, payload);
    }

    async async_get_request(endpoint, token, headers = this.base_header) {
        var headers = headers.copy();
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
        var api_endpoint = this.driver.endpoints.capabilities;

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