"use strict";

const Db = require('./db');
const shortid = require('shortid');

module.exports = class Connection {
    constructor(id) {
        if (typeof id !== 'undefined') {
            if (typeof Db.db().get('connections').find({id: this.id}).value() !== 'undefined') {
                this.connected = true;
                this.id = id;
            } else {
                this.connected = false;
            }
        } else {
            do {
                this.id = shortid.generate();
            } while (typeof Db.db().get('connections').find({id: this.id}).value() !== 'undefined');
            Db.db().get('connections')
                .push({id: this.id})
                .write();
        }
    }

    isConnected() {
        return this.connected;
    }

    getId() {
        return this.id;
    }
};
