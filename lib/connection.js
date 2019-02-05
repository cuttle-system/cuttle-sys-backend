"use strict";

const Db = require('./db');
const shortid = require('shortid');
const fs = require('fs');

module.exports = class Connection {
    constructor(id) {
        if (typeof id !== 'undefined') {
            if (typeof Db.db().get('connections').find({id}).value() !== 'undefined') {
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

    getEditableFiles() {
        let files = {};
        let rootPath = Db.db().get('root_path').value();
        files.translatedFilesList = fs.readdirSync(`${rootPath}/${this.getId()}`);
        files.configurationFilesList = []; //fs.readdirSync(rootPath.'/assets/photos/');
        return files;
    }

    getId() {
        return this.id;
    }
};
