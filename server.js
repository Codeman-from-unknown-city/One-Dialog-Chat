'use strict';

const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const PORT = process.env.PORT || 80;

const routing = {
    '/': res => fs.readFile('./static/index.html', 'utf-8', (err, data) => (
        res.writeHead(200, 'OK', {'Content-Type': 'text/html'}), 
        res.end(data, 'utf-8')
        )),
}

function setContentType(url) {
    let fileNameParts = url.split('.');
    let ext = fileNameParts[fileNameParts.length - 1];
    if (ext === 'css' || ext === 'html') return `text/${ext}`;
    if (ext === 'ico' || ext === 'png') return 'image/x-icon';
    if (ext === 'js') return 'text/javascript';
}

const server = http.createServer((req, res) => {
    const fsCallback = (err, data) => {
        try {
            if (err) throw err;
            res.writeHead(200, 'OK', {'Content-Type': setContentType(req.url)});
            res.end(data, 'utf-8');
        } catch(err) {
            res.end('HTTP/1.1 404 Page Not Found\r\n\r\n');
        }
    }

    if (routing[req.url]) routing[req.url](res);
    else fs.readFile(`./static${req.url}`, 'utf-8', fsCallback);
    
}).listen(PORT);

server.on('clientError', (err, socket) => {
    if (err.code === 'ECONNRESET' || !socket.writable) return;
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

const ws = new WebSocket.Server({
    server,
    clientTracking: true,
});

ws.on('connection', chatLogic);

const users = [];

function getUserIndex(arr, socket) {
    let userIndex;
    arr.forEach((user, index) => {if (user.socket === socket) userIndex = index});
    return userIndex;
}

function sendUpdateUsersList() {
    users.forEach(user => {
        const usersCopy = users.slice();
        usersCopy.splice(getUserIndex(usersCopy, user.socket), 1);
        const withoutSockets = usersCopy.map(user => ({name: user.name, id: user.id}));
        user.socket.send(JSON.stringify({type: 'usersList', names: withoutSockets, ownId: user.id}));
    });
}

function chatLogic(socket) {
    let collocutor;
    socket.on('message', jsonMessage => {
        const data = JSON.parse(jsonMessage);

        switch(data.typeForServer) {
            case 'userName':
                users.push({name: data.name, socket, id: Date.now()});
                sendUpdateUsersList();
                break;
            case 'collocutorId':
                users.forEach(user => {
                    if (user.id === data.toId) {
                        collocutor = user.socket;
                        user.socket.send(jsonMessage);
                    }
                });
                break;
            case 'userMessage': 
                collocutor.send(jsonMessage);
                break;
            default: 
                users.forEach(user => user.id === data.toId ? user.socket.send(jsonMessage) : null);
        }
    });    

    socket.on('close', () => {
        if (collocutor) collocutor.send(JSON.stringify({type: 'out'}));
        users.splice(getUserIndex(users, socket), 1);
        sendUpdateUsersList();
    });
}