"use strict";

const Db = require('./db');
const shortid = require('shortid');
const fs = require('fs');

class Connection {
    isTranslatedFile(file) {
        return file.isFile() && !file.name.startsWith('.') && file.name !== 'template_name.txt' && !file.name.endsWith('.cutc');
    }

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

    getExtension(file) {
        const available = {
            'py': 'python',
            'php': 'php',
        };
        const extension = file.split('.').slice(-1)[0];
        const matched = available[extension === 'output' ? file.split('.').slice(-2)[0] : extension];
        return (typeof matched === 'undefined') ? 'txt' : matched;
    }

    getTranslatedFileContent(file) {
        let rootPath = Db.db().get('root_path').value();
        const directory = `${rootPath}/${this.getId()}`;
        const path = `${directory}/${file}`;
        const code = fs.readFileSync(path).toString();
        return {path, filename: file, configuration: {mode:  this.getExtension(file)}, lines: [[{
            code,
            removable: false,
            codeMirror: true
        }]]};
    }

    getEditableFiles() {
        let files = {};
        let rootPath = Db.db().get('root_path').value();
        const directory = `${rootPath}/${this.getId()}`;
        const allFiles = fs.readdirSync(directory, {withFileTypes: true});
        files.translatedFilesList = allFiles.filter(file => this.isTranslatedFile(file)).map(file => file.name);
        files.configurationFilesList = []; //fs.readdirSync(rootPath.'/assets/photos/');
        return files;
    }

    getId() {
        return this.id;
    }
}

module.exports = Connection;
