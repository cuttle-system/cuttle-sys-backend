"use strict";

const Connection = require('./lib/connection');
const Db = require('./lib/db');

// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'cuttle-sys-backend';
// Port where we'll run the websocket server
const webSocketsServerPort = 1337;
// websocket and http servers
const webSocketServer = require('websocket').server;

if (!Db.db().get('ssl').get('disable').value()) {
    var http = require('https');
} else {
    var http = require('http');
}

const crypto = require('crypto');
const fs = require("fs");

/**
 * Global variables
 */
// latest 100 messages
var history = [ ];
// list of currently connected clients (users)
var clients = [ ];
/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const templates = [
    {id: 'php-7.1.0->ecmascript-5', name: 'PHP 7.1.0 to EcmaScript 5'},
    {id: 'ecmascript-5->php-7.1.0', name: 'EcmaScript 5 to PHP 7.1.0'}
];

/**
 * HTTP server
 */
var server = http.createServer(function(request, response) {

    // Not important for us. We're writing WebSocket server,
    // not HTTP server
});

if (!Db.db().get('ssl').get('disable').value()) {
    const privateKey = fs.readFileSync(Db.db().get('ssl').get('private').value()).toString();
    const certificate = fs.readFileSync(Db.db().get('ssl').get('certificate').value()).toString();

    const credentials = crypto.createCredentials({key: privateKey, cert: certificate});
    server.setSecure(credentials);
}

server.listen(webSocketsServerPort, function() {
    console.log((new Date()) + " Server is listening on port "
        + webSocketsServerPort);
});

/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
    // WebSocket server is tied to a HTTP server. WebSocket
    // request is just an enhanced HTTP request. For more info
    // http://tools.ietf.org/html/rfc6455#page-6
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
        if (message.type === 'utf8') { // accept only text
            // first message sent by user is their name
            // remember user name
            console.log(message.utf8Data);
            let messageObject = JSON.parse(message.utf8Data);
            if (messageObject.type === 'create') {
                const userConnection = new Connection();
                // messageObject.templateId;
                // npm copy from template
                connection.sendUTF(JSON.stringify({type: 'create', connectionId: userConnection.getId()}));
            } else if (messageObject.type === 'getFilesList') {
                const userConnection = new Connection(messageObject.connectionId);
                connection.sendUTF(
                    JSON.stringify({type: 'getFilesList', connectionId: userConnection.getId(), files: []}));
            } else if (messageObject.type === 'getTemplates') {
                connection.sendUTF(
                    JSON.stringify({type: 'getTemplates', templates}));
            } else {
                console.error('Failed to dispatch message: ' + messageObject.type);
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

        // if (userName !== false && userColor !== false) {
        //     console.log((new Date()) + " Peer "
        //         + connection.remoteAddress + " disconnected.");
        //     // remove user from the list of connected clients
            clients.splice(index, 1);
        //     // push back user's color to be reused by another user
        //     colors.push(userColor);
        // }
    });
});
