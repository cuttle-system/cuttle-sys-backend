"use strict";

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('data/db.json');
const db = low(adapter);

// Set some defaults (required if your JSON file is empty)
db.defaults({
    connections: [],
    ssl: {
        disable: true,
        private: 'privatekey.pem',
        certificate: 'certificate.pem'
    },
    template_path: 'data/templates',
    root_path: 'data/connections'
    })
    .write();

module.exports = class Db {
    static db() {
        return db;
    }
};
