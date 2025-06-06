/**
 * Пример event server
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const wss = new WebSocketServer({ noServer: true });
let clients = [];
let sockets = [];

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));


const writeUserCount =()=> {
    const clientsLengths = JSON.stringify({ clients: clients.length });

    for (const client of clients) {
        client.write(`data: ${clientsLengths}\n\n`);
    }
}


app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    clients.push(res);
    writeUserCount();

    req.on('close', () => {
        clients = clients.filter((c) => c !== res);
        writeUserCount();

        res.end();
    });
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
app.post('/send', (req, res) => {
    const msg = req.body?.message ?? 'Пустое сообщение';
    const payload = JSON.stringify({ id: req.body.id , data: msg, clients: clients.length });
    
    for (const client of clients) {
        client.write(`data: ${payload}\n\n`);
    }

    res.sendStatus(200);
});


const server = app.listen(process.env.PORT || 3000, () => {
    console.log('🚀 SSE + WS сервер запущен');
});


wss.on('connection', (ws) => {
    sockets.push(ws);
    
    console.log('🧩 WebSocket connected');
    sockets.forEach(s => {
        s.send(JSON.stringify({
            id: ws.id,
            clients: clients.length,
            sockets: sockets.length,
            message: '🔌 connected client',
        }));
    });


    ws.on('message', (msg) => {
        const parse = JSON.parse(msg.toString());

        const payload = JSON.stringify({ 
            ...parse,
            id: ws.id,
            clients: clients.length,
            sockets: sockets.length 
        });
        sockets.forEach(s => {
            s.send(payload);
        });
    });
    ws.on('close', () => {
        const i = sockets.indexOf(ws);
        if (i !== -1) sockets.splice(i, 1);
        console.log('disconnected socket');

        sockets.forEach(s => {
            s.send(JSON.stringify({
                id: ws.id,
                clients: clients.length,
                sockets: sockets.length,
                message: '🔌❌ disconnected client',
            }));
        });
    });
});
server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const id = url.searchParams.get('id');

    wss.handleUpgrade(req, socket, head, (ws) => {
        ws.id = id;
        wss.emit('connection', ws, req);
    });
});