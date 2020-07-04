'use strict';

const fs = require('fs');
const fsPromises = fs.promises;
const http = require('http');
const path = require('path');
const minify = require('./utils/minify');
const createErrorPage = require('./utils/templates/err/createErrorTemplate');

const PORT = process.env.PORT || 80;
const STATIC_PATH = path.join(process.cwd(), './static');
const STATIC_PATH_LENGTH = STATIC_PATH.length;

const cache = new Map();

const cacheFile = async filePath => {
    let data;
    const fileExt = path.extname(filePath).substring(1);
    if (fileExt === 'png') data = await fsPromises.readFile(filePath);
    else data = await fsPromises.readFile(filePath, 'UTF-8');
    const key = filePath.substring(STATIC_PATH_LENGTH);
    let correctKey = '/' + key.slice(1);
    while (correctKey.includes('\\')) {
        const subStrInd = correctKey.indexOf('\\');
        correctKey = correctKey.slice(0, subStrInd) + '/' + correctKey.slice(subStrInd + 1);
    }
    cache.set(correctKey, minify(data, fileExt));
};

const cacheDirectory = async directoryPath => {
  const files = await fsPromises.readdir(directoryPath, { withFileTypes: true });
  for (const file of files) {
    const filePath = path.join(directoryPath, file.name);
    if (file.isDirectory()) cacheDirectory(filePath);
    else cacheFile(filePath);
  }
};

cacheDirectory(STATIC_PATH);

const MIME_TYPES = {
  html: 'text/html; charset=UTF-8',
  js: 'application/javascript; charset=UTF-8',
  css: 'text/css',
  png: 'image/png',
  txt: 'text/plain',
};

const routing = {
    '/': res => {
            const data = cache.get(`/index.html`);
            res.writeHead(200, 'OK', {'Content-Type': MIME_TYPES.html}); 
            res.end(data, 'UTF-8');
        },
}

const server = http.createServer((req, res) => {
    const { url } = req;
    const handler = routing[url];
    if (handler) handler(res);
    else {
        const data = cache.get(url);
        if (data) {
            const fileExt = path.extname(url).substring(1);
            const mimeType = MIME_TYPES[fileExt] ?? MIME_TYPES.txt;
            res.writeHead(200, 'OK', { 'Content-Type': mimeType });
            res.end(data);
        }
        else {
            res.writeHead(404);
            res.end(createErrorPage('HTTP/1.1 404 Page Not Found'));
        }
    }
}).listen(PORT);

server.on('clientError', (err, socket) => {
    if (err.code === 'ECONNRESET' || !socket.writable) return;
    socket.end(createErrorPage('HTTP/1.1 400 Bad Request'));
});

module.exports = server;
