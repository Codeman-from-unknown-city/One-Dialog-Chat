'use strict';

const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const PORT = process.env.PORT || 8000;

const routing = {
    '/': fs.readFileSync('./static/index.html', 'utf-8'),
    '/client.min.js': fs.readFileSync('./static/client.min.js', 'utf-8'),
    '/style.css': fs.readFileSync('./static/style.css', 'utf-8'),
    '/favicon.ico': fs.readFileSync('./static/favicon.ico'),
};

const setContentType = (res, url) => {
    let ext = url.split('.')[-1];   
    if (ext === 'css' || ext === 'html') res.setHeader('Content-Type', `text/${ext}`);
    if (ext === 'ico') res.setHeader('Content-Type', 'image/x-icon');
    if (ext === 'js') res.setHeader('Content-Type', 'text/javascript');
}

const server = http.createServer(function(req, res) {
    if (req.url === '/') res.setHeader('Content-Type', 'text/html');
    else setContentType(res, req.url);
    const file = routing[req.url];
    res.writeHead('200');
    res.end(file);
});

server.listen(PORT);

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
        user.socket.send(JSON.stringify({type: 'usersList', names: withoutSockets}));
    });
}

function chatLogic(socket) {
    let collocutor;
    socket.on('message', jsonMessage => {
        const data = JSON.parse(jsonMessage);
        switch(data.type) {
            case 'userName':
                users.push({name: data.name, socket, id: Date.now()});
                sendUpdateUsersList();
                break;

            case 'sendInvite':
                let senderId;
                let recipientSocket;
                users.forEach(user => {
                    if (user.socket === socket) senderId = user.id;
                    if (user.id === +data.id) recipientSocket = user.socket;
                });
                recipientSocket.send(JSON.stringify({type: 'invite', fromName: data.from, fromId: senderId}));
                break;

            case 'responseToInvitation':
                users.forEach(user => {
                    if (user.id === data.toId) {
                        if (data.response === 'ok') {
                            user.socket.send(JSON.stringify({
                                type: 'responseToInvitation',
                                response: 'ok', 
                                fromName: data.receiverName, 
                                id: users[getUserIndex(users, socket)].id,
                            }));
                            collocutor = user;
                        } else user.socket.send(JSON.stringify({
                            type: 'responseToInvitation',
                            response: data.response, 
                            fromName: data.receiverName,
                        })); 
                    }
                });
                break;

            case 'begin':
                users.forEach(user => {
                    if (user.id === data.id) {
                        collocutor = user;
                        collocutor.socket.send(JSON.stringify({type: 'invite', name: data.name, beginChat: true}));
                    }
                });
                break;
                
            case 'message':
                collocutor.socket.send(JSON.stringify({type: 'message', message: data.message,}));
                break;
        }
    });

    socket.on('close', () => {
        if (collocutor) collocutor.socket.send(JSON.stringify({type: 'out'}));
        users.splice(getUserIndex(users, socket), 1);
        sendUpdateUsersList();
    });
}