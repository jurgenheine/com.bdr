'use strict';

const BdrDriver = require('../bdrdriver');

class RemahaDriver extends BdrDriver {
    async onInit() {
        this.init('Remeha');
    }
}

module.exports = RemahaDriver;