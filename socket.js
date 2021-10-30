//node 서버와 python 프로그램 인터페이스 프로그램
//1. 텔레메트리 정보 받기
//2. 모터 동작, LED(차후 추가) 동작
//3. mToken 등록? 아마
//
var net = require('net');
const fs = require('fs');
const EventEmitter = require('events');

const mobileData = new Data();

const sendMsgType = {
  empty: 0,
  motor: 1,
  led: 2,
  music: 3,
  mToken: 4,
  reqMToken: 5,
  userName: 6,
  reqUserName: 7,
  reqNameAndToken: 8,
  reqAllTelemetry: 9,
  deleteMToken: 10
};

const recMsgType = {
  telemetry: 0
};

class SendMsg {
  constructor(msgType, value) {
    this.msgType = msgType;
    this.value = value; // json type
  }
  getJson() {
    return json.dumps({ "msgType": this.msgType, value }).encode('UTF-8');
  }
}

class IPCsocket {

  constructor(graphData) {
    this.sendMsgBox = [];
    this.client = null;
    this.graphData = graphData;
  }

  addSendMsg(commandMsg) {
    this.sendMsgBox.push(commandMsg);
  }

  telemetryHandle(chunk) {
    let temper, humid, decibel;
    temper = chunk.temperature;
    humid = chunk.humidity;
    decibel = chunk.decibel;
    mobileData.setData(temper, humid, decibel);
  };
  sendMessageToPython(sendMsg) {
    if (!sendMsg) {
      console.log("node server senMsg null or empty")
    }
    if (this.client != null) {
      this.client.write(JSON.stringify(sendMsg));
      console.log("nodemsesage : " + JSON.stringify(sendMsg));
    } else {
      console.write("클라이언트 연결없음 ")
    }
  }

  connect() {

    var server = net.createServer(client => { //IPC용 서버 개방//net 자체가 IPC용이다.
      const chunks = [];
      if (this.client == null) { //혹시 몰라서
        this.client = client;
        console.log("IPC 서버 생성, 클라이언트 초기화")
      }

      console.log(`client connected`);
      client.setEncoding('utf8');

      client.on('end', () => {
        this.client = null;
        console.log('client disconnected');
      });


      client.on('data', chunk => { //파이썬에서 메세지 보내면 여기로옴, 데이터 타입 JSON 
        //{"msgType":"?:number","temperature": "??","humidity":"??","decibel":"??"} msgType 나중에 확장성을 위해서
        //이쪽에서 이벤트를 통해 메세지를 직접 보낼수가 없다. 근데 python 에서 주기적으로 메세지 보내니깐 그에 응답으로 보내면되지않을까?

        const jsonChunk = JSON.parse(chunk);
        switch (jsonChunk.msgType) {  //메세지 받는 부분 
          case recMsgType.telemetry:
            this.telemetryHandle(jsonChunk);
            break;
          case sendMsgType.reqMToken:
            console.log(jsonChunk[value]);
            break;
          case sendMsgType.reqNameAndToken:
            console.log("node socket.js 96::" + chunk);
            break;
          case sendMsgType.reqAllTelemetry:
            this.graphData.init(jsonChunk.data);
            console.log("node get All telemetry:" + chunk);
            break;

          default:
            console.log("Undefined msgType :" + chunk);
        }

        //       if (this.sendMsgBox.length == 0) { //메세지 보내는 부분 
        //         client.write(JSON.stringify({ msgType: sendMsgType.empty }));
        //       }
        //       else {
        //         while (this.sendMsgBox.length > 0) {
        //           let sendMsg = this.sendMsgBox.pop();
        //           client.write(JSON.stringify(sendMsg));
        // console.log(JSON.stringify(sendMsg));
        //         }
        //       }

      });
    });
    server.on('listening', () => {
      console.log(`Server listening`);
    });
    console.log('check');

    if (fs.existsSync('/tmp/example.sock')) {
      fs.unlink('/tmp/example.sock', (err) => {
        if (err) throw err;
        console.log('/tmp/exaple.sock , pipe file deleted');
      })
    }

    server.listen('/tmp/example.sock');
  }
}

function Data() {
  this.temp = 0;
  this.humid = 0;
  this.decibel = 0;

  this.setData = (temp, humid, decibel) => {
    this.temp = temp;
    this.humid = humid;
    this.decibel = decibel;
  }
  this.getData = () => {
    const temp = this.temp;
    const humid = this.humid;
    const decibel = this.decibel;
    return { temp, humid, decibel };
  }
}

class GraphData{
  constructor() {
    this.temps=[];
    this.humids =[];
    this.decibels=[];
    this.dates=[];
  }
  init(datas) {
    console.log("type check';';;';';';"+typeof(datas[0][0]));
    console.log(typeof(datas[0][1]));
    console.log(typeof(datas[0][2]));
    console.log(typeof(datas[0][3]));
    datas.forEach(data => {
      this.temps.push(data[0]);
      this.humids.push(data[1]);
      this.decibels.push(data[2]);
      this.dates.push(data[3]);
    });
    this.emit('init');
  }
  getDatas() {
    const temps = this.temps;
    const humids = this.humids;
    const decibels = this.decibels;
    const dates = this.dates;
    return { temps, humids, decibels, dates };
  }
  getTemps() {
    return this.temps;
  }
  getHumids() {
    return this.humids;
  }
  getDecibels() {
    return this.decibels;
  }
  getDatas() {
    return this.dates;
  }
}



module.exports = { IPCsocket, sendMsgType, recMsgType, SendMsg, mobileData, GraphData };
