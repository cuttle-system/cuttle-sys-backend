"use strict";

const Connection = require('./lib/connection');
const Db = require('./lib/db');
const Runner = require('./lib/runner');
const _ = require("lodash");

// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'cuttle-sys-backend';
// Port where we'll run the websocket server
const webSocketsServerPort = 1337;
// websocket and http servers
const webSocketServer = require('websocket').server;

const fs = require('fs');

/**
 * Global variables
 */
// latest 100 messages
let history = [];
// list of currently connected clients (users)
let clients = [];
/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getTemplates() {
    let templates = [];
    let templatePath = Db.db().get('template_path').value();
    fs.readdirSync(templatePath).forEach(file => {
        templates.push({id: file, name: fs.readFileSync(templatePath + '/' + file + '/template_name.txt').toString()});
    });
    return templates;
}

if (!Db.db().get('ssl').get('disable').value()) {
    let https = require('https');

    const privateKey = fs.readFileSync(Db.db().get('ssl').get('private').value()).toString();
    const certificate = fs.readFileSync(Db.db().get('ssl').get('certificate').value()).toString();

    const httpsOptions = {key: privateKey, cert: certificate};

    var server = https.createServer(httpsOptions, function(request, response) {});
} else {
    let http = require('http');
    var server = http.createServer(function(request, response) {});
}

server.listen(webSocketsServerPort, function() {
    console.log((new Date()) + " Server is listening on port "
        + webSocketsServerPort);
});

/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
    httpServer: server
});
// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin '
        + request.origin + '.');
    // accept connection - you should check 'request.origin' to
    // make sure that client is connecting from your website
    // (http://en.wikipedia.org/wiki/Same_origin_policy)
    var connection = request.accept(null, request.origin);
    // we need to know client index to remove them on 'close' event
    var index = clients.push(connection) - 1;
    console.log((new Date()) + ' Connection accepted.');
    // send back chat history
    if (history.length > 0) {
        connection.sendUTF(
            JSON.stringify({ type: 'history', data: history} ));
    }
    // user sent some message
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log(message.utf8Data);

            let messageObject = JSON.parse(message.utf8Data);
            if (messageObject.type === 'create') {
                const templates = getTemplates();
                if (_.find(templates, {id: messageObject.template})) {
                    const templatePath = Db.db().get('template_path').value();
                    const rootPath = Db.db().get('root_path').value();
                    const userConnection = new Connection();
                    Runner.execute(`cp -R ${templatePath}/${messageObject.template} ${rootPath}/${userConnection.getId()}`,
                        (stdout, stderr) => {
                            connection.sendUTF(JSON.stringify({type: 'create', connectionId: userConnection.getId()}));
                        });
                } else {
                    connection.sendUTF(JSON.stringify({type: 'create', error: true}));
                }
                // messageObject.templateId;
                // npm copy from templates
            } else if (messageObject.type === 'getTemplates') {
                connection.sendUTF(
                    JSON.stringify({type: 'getTemplates', templates: getTemplates()}));
            } else {
                const userConnection = new Connection(messageObject.connectionId);
                if (!userConnection.isConnected()) {
                    connection.sendUTF(
                        JSON.stringify({
                            type: 'error',
                            message: 'Connection was not found: ' + messageObject.connectionId,
                        }));
                } else {
                    if (messageObject.type === 'getFilesList') {
                        connection.sendUTF(
                            JSON.stringify({
                                type: 'getFilesList',
                                connectionId: userConnection.getId(),
                                filesList: userConnection.getEditableFiles()
                            }));
                    } else if (messageObject.type === 'getFiles') {
                        connection.sendUTF(
                            JSON.stringify({
                                type: 'getFiles',
                                connectionId: userConnection.getId(),
                                files: {
                                    translatedFiles: messageObject.filesList.translatedFiles.map(file => userConnection.getTranslatedFileContent(file)),
                                    configurationFiles: []
                                }
                            }));
                    } else if (messageObject.type === 'updateFiles') {
                        updateFiles(messageObject.files);
                        connection.sendUTF(JSON.stringify());
                    } else {
                        connection.sendUTF(
                            JSON.stringify({
                                type: 'error',
                                message: 'Failed to dispatch message: ' + messageObject.type,
                            }));
                    }
                }
            }
            // } else { // log and broadcast the message
            //     console.log((new Date()) + ' Received Message from '
            //         + userName + ': ' + message.utf8Data);
            //
            //     // we want to keep history of all sent messages
            //     var obj = {
            //         time: (new Date()).getTime(),
            //         text: htmlEntities(message.utf8Data),
            //         author: userName,
            //         color: userColor
            //     };
            //     history.push(obj);
            //     history = history.slice(-100);
            //     // broadcast message to all connected clients
            //     let json = JSON.stringify({ type:'message', data: obj });
            //     for (let i = 0; i < clients.length; i++) {
            //         clients[i].sendUTF(json);
            //     }
            // }
        }
    });
    // user disconnected
    connection.on('close', function(connection) {
        console.log((new Date()) + " Peer "
            + connection + " disconnected.");

        clients.splice(index, 1);
    });
});
