/**
 * Пример event server
 */

import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());


let clients = [];


app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    clients.push(res);
    console.log('💡 Новый клиент подключён');

    req.on('close', () => {
        clients = clients.filter((c) => c !== res);
        res.end();
    });
});

app.post('/send', (req, res) => {
    const msg = req.body?.message ?? 'Пустое сообщение';
    const payload = JSON.stringify({ message: msg });

    for (const client of clients) {
        client.write(`data: ${payload}\n\n`);
    }

    res.sendStatus(200);
});


app.listen(3000, () => {
    console.log('🚀 SSE сервер запущен: http://localhost:3000/events');
});