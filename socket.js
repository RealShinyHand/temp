const SocketIO = require('socket.io');
const path = require('path');
const fs = require('fs');

module.exports = (server, app) => {
    const io = SocketIO(server, { path: '/socket.io' });
    app.set('io', io);

    io.on('connection', (socket) => { // 웹소켓 연결 시
        const req = socket.request;
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        console.log('새로운 클라이언트 접속!', ip, socket.id);
        socket.on('disconnect', () => { // 연결 종료 시
            console.log('클라이언트 접속 해제', ip, socket.id);
        });
        socket.on('error', (error) => { // 에러 시
            console.error(error);
        });
        socket.interval = setInterval(() => { // 3초마다 클라이언트로 메시지 전송
            
            socket.emit('data', {
                temperature: getRandomIntInclusive(0, 50),
                humidity: getRandomIntInclusive(20, 150),
            });
        }, 3000);
    });
};

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //최댓값도 포함, 최솟값도 포함
}