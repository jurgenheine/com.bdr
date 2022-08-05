'use strict';

if (process.env.DEBUG === '1')
{
    require('inspector').open(9223, '0.0.0.0', true);
}

const Homey = require('homey');

class BdrCloudApp extends Homey.App {

    async onInit() {
    }

}
module.exports = BdrCloudApp;
