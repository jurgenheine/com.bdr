'use strict';

const BdrDriver = require('../bdrdriver');
class BaxiDriver extends BdrDriver {
    async onInit() {
        this.init('Baxi');
    }
}

module.exports = BaxiDriver;