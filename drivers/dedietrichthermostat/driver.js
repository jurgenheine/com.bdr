'use strict';

const BdrDriver = require('../bdrdriver');
class DeDietrichDriver extends BdrDriver {
    async onInit() {
        this.init('Dedietrich');
    }
}

module.exports = DeDietrichDriver;