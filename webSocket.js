const SocketIO = require('socket.io');
const path = require('path');
const fs = require('fs');
const { mobileData } = require('./socket');

const currentUser = [];

module.exports = (server, app, PubSub) => {
    const io = SocketIO(server, { path: '/socket.io' });
    app.set('io', io);

    io.on('connection', (socket) => { // 웹소켓 연결 시
        var subscriber_token = PubSub.subscribe('MJPEG', function(msg, data) {
            socket.emit('image', Buffer.from(data));
        });
        const req = socket.request;
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        console.log('새로운 클라이언트 접속!', ip, socket.id);
        currentUser.push(ip);
        io.emit('user', { currentUser});
        socket.on('disconnect', () => { // 연결 종료 시
            console.log('클라이언트 접속 해제', ip, socket.id);
            PubSub.unsubscribe(subscriber_token);
            const index = currentUser.findIndex(el => el === ip);
            currentUser.splice(index, 1);
            io.emit('user', {currentUser});
        });
        socket.on('error', (error) => { // 에러 시
            console.error(error);
        });
        socket.interval = setInterval(() => { // 3초마다 클라이언트로 메시지 전송
            const {temp , humid, decibel } = mobileData.getData();
            socket.emit('data', {
                temperature: temp,
                humidity: humid,
                decibel,
            });
        }, 3000);
    });
};

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //최댓값도 포함, 최솟값도 포함
}
