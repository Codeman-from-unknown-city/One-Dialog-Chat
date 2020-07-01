'use strict';

const fs = require('fs');
const http = require('http');
const PORT = process.env.PORT || 80;

const routing = {
    '/': res => fs.readFile('./static/index.html', 'utf-8', (err, data) => (
            res.writeHead(200, 'OK', {'Content-Type': 'text/html'}), 
            res.end(data, 'utf-8')
        )),
}

function setContentType(url) {
    const fileNameParts = url.split('.');
    const ext = fileNameParts[fileNameParts.length - 1];
    
    switch(ext) {
        case 'css':
        case 'html':
            return `text/${ext}`;

        case 'ico':
        case 'png':
            return 'image/x-icon';

        case 'js':
            return 'text/javascript';

        default:
            return 'text/plain';
    }
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

exports.server = server;
