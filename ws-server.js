'use strict';

const httpServer = require('./http-server').server;
const WebSocket = require('ws');

const users = new Map();

const createId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,(c,r)=>('x'==c?(r=Math.random()*16|0):(r&0x3|0x8)).toString(16));

function createUser(socket, userName) {
    const id = createId();
    socket.send(JSON.stringify({type: 'id', id}));
    users.set(id, {socket, name: userName});
    sendUpdateUsersList();
}

function sendUpdateUsersList() {
    const usersForCli = {};
    users.forEach((user, id) => usersForCli[id] = user.name);
    users.forEach(user => user.socket.send(JSON.stringify({type: 'usersList', users: usersForCli})));
} 

function chatLogic(socket) {
    let collocutor;
    socket.on('message', jsonMessage => {
        const data = JSON.parse(jsonMessage);

        switch(data.typeForServer) {
            case 'userName':
                createUser(socket, data.name);
                break;

            case 'collocutorId':
                collocutor = users.get(data.toId).socket;
                collocutor.send(jsonMessage);
                break;

            case 'userMessage': 
                collocutor.send(jsonMessage);
                break;

            default: 
                users.get(data.toId).socket.send(jsonMessage);
        }
    });    

    socket.on('close', () => {
        if (collocutor) collocutor.send(JSON.stringify({type: 'out'}));
        users.forEach((user, id) => user.socket === socket ? users.delete(id) : null);
        sendUpdateUsersList();
    });
}

const wss = new WebSocket.Server({
    server: httpServer,
    clientTracking: true,
});

wss.on('connection', chatLogic);
