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

const users = new Map();
const usersForCli = {};

const createId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,(c,r)=>('x'==c?(r=Math.random()*16|0):(r&0x3|0x8)).toString(16));
const sendUpdateUsersList = () => users.forEach(userSocket => userSocket.send(JSON.stringify({type: 'usersList', users: usersForCli})));

function chatLogic(socket) {
    let collocutor;
    socket.on('message', jsonMessage => {
        const data = JSON.parse(jsonMessage);

        switch(data.typeForServer) {
            case 'userName':
                const id = createId();
                socket.send(JSON.stringify({type: 'id', id}));
                users.set(id, socket);
                usersForCli[`${id}`] = data.name;
                sendUpdateUsersList();
                break;

            case 'collocutorId':
                collocutor = users.get(data.toId);
                collocutor.send(jsonMessage);
                break;

            case 'userMessage': 
                collocutor.send(jsonMessage);
                break;

            default: 
                users.get(data.toId).send(jsonMessage);
        }
    });    

    socket.on('close', () => {
        if (collocutor) collocutor.send(JSON.stringify({type: 'out'}));
        users.forEach((userSocket, id) => {
            if (userSocket === socket) {
                users.delete(id);
                delete usersForCli[`${id}`];
            }
        });
        sendUpdateUsersList();
    });
}