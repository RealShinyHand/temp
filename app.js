const express = require('express');
const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');
const ip = require("ip");
const {IPCsocket, sendMsgType, recMsgType, SendMsg, GraphData, SettingData} = require('./socket');

const webSocket = require('./webSocket');
var os = require('os'),
    http = require("http"),
    util = require("util"),
    chokidar = require('chokidar'),
    PubSub = require("pubsub-js"),
    localIp = require('ip'),
    PiCamera = require('./camera.js'),
    program = require('commander'),
    pjson = require('./package.json');
//parameter
program
    .version(pjson.version)
    .description(pjson.description)
    .option('-p --port <n>', 'port number (default 8080)', parseInt)
    .option('-w --width <n>', 'image width (default 640)', parseInt)
    .option('-l --height <n>', 'image height (default 480)', parseInt)
    .option('-q --quality <n>', 'jpeg image quality from 0 to 100 (default 85)', parseInt)
    .option('-s --sharpness <n>', 'Set image sharpness (-100 - 100)', parseInt)
    .option('-c --contrast <n>', 'Set image contrast (-100 - 100)', parseInt)
    .option('-b --brightness <n>', 'Set image brightness (0 - 100) 0 is black, 100 is white', parseInt)
    .option('-s --saturation <n>', 'Set image saturation (-100 - 100)', parseInt)
    .option('-t --timeout <n>', 'timeout in milliseconds between frames (default 500)', parseInt)
    .option('-v --version', 'show version')
    .parse(process.argv);
//parameter
var port = program.port || 8080,
    width = program.width || 640,
    height = program.height || 480,
    timeout = 250,
    quality = program.quality || 75,
    sharpness = program.sharpness || 0,
    contrast = program.contrast || 0,
    brightness = program.brightness || 50,
    saturation = program.saturation || 0,
    tmpFolder = path.join(__dirname, 'public'),
    tmpImage = pjson.name + '-image.jpg',
    localIpAddress = localIp.address(),
    boundaryID = "BOUNDARY";

program.on('--help', function(){
        console.log("Usage: " + pjson.name + " [OPTION]\n");
      });

const app = express();

app.set('port', process.env.PORT || 8001);
app.set('view engine', 'html');
nunjucks.configure('views', {
    express: app,
    watch: true,
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const spawn = require('child_process').spawn;
let proc;

app.get('/', (req, res) => {
    console.log("default");
    res.render('index', { ip: ip.address() });
});
app.get('/settings', (req, res) => {
    ipcSocket.sendMessageToPython({"msgType":sendMsgType.reqNameAndToken}); //??? ??????????????? ????????? token??? ?????? ??????????????? 
    settingData.once('init', (data) => {
        const {name, mTokens, desc,alarmConfig} = data;
        res.render('settings', { ...data });     
    });
    
   // res.render('settings', { name:"qwe",mTokens:"111",desc:"hi",alarmConfig:{"minTemper":20} });     
});
app.get('/graph', (req, res) => {
	console.log("graph page");
    
	ipcSocket.sendMessageToPython({"msgType":sendMsgType.reqAllTelemetry});
    graphData.once('init', (datas) => {
        const { temps, humids, decibels, dates } = datas;
       return res.render('graph', { temps, humids, decibels, dates });
    });
	console.log("graph page end");
});


app.post('/user', (req, res, next) => {
    const { userName } = req.body;
    console.log("?????? ??????:", userName);
    ipcSocket.sendMessageToPython({"msgType":sendMsgType.userName,"value":userName})
    res.redirect('/settings');
});

app.post('/token', (req, res, next) => {
    const { desc,mToken } = req.body;
    console.log("??????:", mToken);
    ipcSocket.sendMessageToPython({"msgType":sendMsgType.mToken,"value":mToken,"desc":desc});
    res.redirect('/settings');
});
app.post('/delete', (req, res, next) => {
    const  deletedToken  = req.body;
    console.log("??????:", req.body);
    ipcSocket.sendMessageToPython({"msgType":sendMsgType.deleteMToken,"value":deletedToken});
    res.redirect('/settings')
});
app.post('/alarm',(req, res, next) => {
    console.log("??????:",req.body);
    const {minTemper,maxTemper,minHumid,maxHumid,decibelRange} = req.body;
    ipcSocket.sendMessageToPython({"msgType":sendMsgType.alarmConfig,"minTemper":minTemper,
    "maxTemper":maxTemper,"minHumid":minHumid,"maxHumid":maxHumid,"decibelRange":decibelRange
});
    res.redirect('/settings');
});
//if user select mtoken that user want to delete, system have to send mToken value
//ipcSoket.sendMessageToPython({"msgType":sendMsgType.deleteMToken,"value":mToken});

app.get('/test1', (req, res) => {
    res.render('test', { ip: ip.address() });
});

app.get('/test',(req,res)=>{
/*	if(req.url === "/test"){
	console.log("connected");
        res.writeHead(200, { "content-type": "text/html;charset=utf-8" });
        res.write('<!doctype html>');
        res.write('<html>');
        res.write('<head><title>' + pjson.name + '</title><meta charset="utf-8" /></head>');
        res.write('<body>');
        res.write('<img src="image.jpg" />');
        res.write('</body>');
        res.write('</html>');
        res.end();
        return;
}
    if (req.url === "/test/healthcheck") {
        res.statusCode = 200;
        res.end();
        return;
    };
  */
    if (true) {
        res.writeHead(200, {
            'Content-Type': 'multipart/x-mixed-replace;boundary="' + boundaryID + '"',
            'Connection': 'keep-alive',
            'Expires': 'Fri, 27 May 1977 00:00:00 GMT',
            'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
            'Pragma': 'no-cache' 
        });

        //
        // send new frame to client
        //
        var subscriber_token = PubSub.subscribe('MJPEG', function(msg, data) {


            res.write('--' + boundaryID + '\r\n')
            res.write('Content-Type: image/jpeg\r\n');
            res.write('Content-Length: ' + data.length + '\r\n');
            res.write("\r\n");
            res.write(Buffer.from(data), 'binary');
            res.write("\r\n");
        });

        //
        // connection is closed when the browser terminates the request
        //
        res.on('close', function() {
            console.log("Connection closed!");
            PubSub.unsubscribe(subscriber_token);
            res.end();
        });
    }
});


app.use((req, res, next) => {
    const error = new Error(`${req.method} ${req.url} ???????????? ????????????.`);
    error.status = 404;
    next(error);
});

app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

const server = app.listen(app.get('port'), () => {
    console.log(app.get('port'), '??? ???????????? ?????????');
});

webSocket(server, app, PubSub);

//camera logic
var tmpFile = path.resolve(path.join(tmpFolder, tmpImage));

// start watching the temp image for changes
var watcher = chokidar.watch(tmpFile, {
  persistent: true,
  usePolling: true,
  interval: 10,
});

// hook file change events and send the modified image to the browser
watcher.on('change', function(file) {

    //console.log('change >>> ', file);

    fs.readFile(file, function(err, imageData) {
        if (!err) {
            PubSub.publish('MJPEG', imageData);
        }
        else {
            console.log(err);
        }
    });
});

// setup the camera 
var camera = new PiCamera();

// start image capture
camera
    .nopreview()
    .baseFolder(tmpFolder)
    .thumb('0:0:0') // dont include thumbnail version
    .timeout(9999999) // never end
    .timelapse(timeout) // how often we should capture an image
    .width(width)
    .height(height)
    .quality(quality)
    .sharpness(sharpness)
    .contrast(contrast)
    .brightness(brightness)
    .saturation(saturation)
    .takePicture(tmpImage);

const graphData = new GraphData();
const settingData = new SettingData();
const ipcSocket = new IPCsocket(graphData, settingData);
ipcSocket.connect();
console.log("script end");
