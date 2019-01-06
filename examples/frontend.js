window.onload = function () {
    "use strict";
    // for better performance - to avoid searching in DOM
    const content = document.querySelector('#content');
    const input = document.querySelector('#input');
    const status = document.querySelector('#status');
    // my color assigned by the server
    let myColor = false;
    // my name sent to the server
    let myName = false;
    // if user is running mozilla then use it's built-in WebSocket
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    // if browser doesn't support WebSocket, just show
    // some notification and exit
    if (!window.WebSocket) {
        content.innerHTML = '<p>Sorry, but your browser doesn\'t support WebSocket.</p>';
        input.style.display = 'none';
        document.querySelector('span').style.display = 'none';
        return;
    }
    // open connection
    const connection = new WebSocket('ws://127.0.0.1:1337');
    connection.onopen = function () {
        // first we want users to enter their names
        input.removeAttribute('disabled');
        status.innerText = 'Choose name:';
    };
    connection.onerror = function (error) {
        // just in there were some problems with connection...
        content.innerHTML = '<p>Sorry, but there\'s some problem with your connection or the server is down.</p>';
    };
    // most important part - incoming messages
    connection.onmessage = function (message) {
        // try to parse JSON message. Because we know that the server
        // always returns JSON this should work without any problem but
        // we should make sure that the message is not chunked or
        // otherwise damaged.
        try {
            var json = JSON.parse(message.data);
        } catch (e) {
            console.log('Invalid JSON: ', message.data);
            return;
        }
        // NOTE: if you're not sure about the JSON structure
        // check the server source code above
        // first response from the server with user's color
        if (json.type === 'color') {
            myColor = json.data;
            status.innerText = myName + ': ';
            status.style.color = myColor;
            input.removeAttribute('disabled');
            input.focus();
            // from now user can start sending messages
        } else if (json.type === 'history') { // entire message history
            // insert every single message to the chat window
            for (let i = 0; i < json.data.length; i++) {
                addMessage(json.data[i].author, json.data[i].text,
                    json.data[i].color, new Date(json.data[i].time));
            }
        } else if (json.type === 'message') { // it's a single message
            // let the user write another message
            input.removeAttribute('disabled');
            addMessage(json.data.author, json.data.text,
                json.data.color, new Date(json.data.time));
        } else {
            console.log('Hmm..., I\'ve never seen JSON like this:', json);
        }
    };
    /**
     * Send message when user presses Enter key
     */
    input.addEventListener('keydown', function(e) {
        if (e.keyCode === 13) {
            const msg = input.value;
            if (!msg) {
                return;
            }
            // send the message as an ordinary text
            connection.send(msg);
            input.value = '';
            // disable the input field to make the user wait until server
            // sends back response
            input.setAttribute('disabled', 'disabled');
            // we know that the first message sent from a user their name
            if (myName === false) {
                myName = msg;
            }
        }
    });
    /**
     * This method is optional. If the server wasn't able to
     * respond to the in 3 seconds then show some error message
     * to notify the user that something is wrong.
     */
    setInterval(function() {
        if (connection.readyState !== 1) {
            status.innerText = 'Error';
            input.setAttribute('disabled', 'disabled');
            input.value = 'Unable to communicate with the WebSocket server.';
        }
    }, 3000);
    /**
     * Add message to the chat window
     */
    function addMessage(author, message, color, dt) {
        content.innerHTML += '<p><span style="color:' + color + '">'
            + author + '</span> @ ' + (dt.getHours() < 10 ? '0'
                + dt.getHours() : dt.getHours()) + ':'
            + (dt.getMinutes() < 10
                ? '0' + dt.getMinutes() : dt.getMinutes())
            + ': ' + message + '</p>';
    }
};
