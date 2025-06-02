/**
 * Пример event server
 */

import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());


let clients = [];
const writeUserCount =()=> {
    const clientsLengths = JSON.stringify({ clients: clients.length });

    for (const client of clients) {
        client.write(`data: ${clientsLengths}\n\n`);
    }
}

app.get('/', (req, res)=> {
    res.sendFile(__dirname+'/build/index.html');
});
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

app.post('/send', (req, res) => {
    const msg = req.body?.message ?? 'Пустое сообщение';
    const payload = JSON.stringify({ id: req.body.id , data: msg, clients: clients.length });
    
    for (const client of clients) {
        client.write(`data: ${payload}\n\n`);
    }

    res.sendStatus(200);
});


app.listen(process.env.PORT || 3000, () => {
    console.log('🚀 SSE сервер запущен');
});