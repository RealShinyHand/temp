//node 서버와 python 프로그램 인터페이스 프로그램
//1. 텔레메트리 정보 받기
//2. 모터 동작, LED(차후 추가) 동작
//3. mToken 등록? 아마
//
var net = require('net');
const fs = require('fs');

const mobileData = new Data();

const sendMsgType = {
  empty: 0,
  motor: 1,
  led: 2,
  mToken: 3
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

  constructor() {
    this.sendMsgBox = [];
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
    console.log(temper, humid, decibel);
  };

  connect() {

    var server = net.createServer(client => { //IPC용 서버 개방//net 자체가 IPC용이다.
      const chunks = [];
      console.log(`client connected`);
      client.setEncoding('utf8');

      client.on('end', () => {
        console.log('client disconnected');
      });


      client.on('data', chunk => { //파이썬에서 메세지 보내면 여기로옴, 데이터 타입 JSON 
        //{"msgType":"?:number","temperature": "??","humidity":"??","decibel":"??"} msgType 나중에 확장성을 위해서
        //이쪽에서 이벤트를 통해 메세지를 직접 보낼수가 없다. 근데 python 에서 주기적으로 메세지 보내니깐 그에 응답으로 보내면되지않을까?
        console.log("00",chunk);
	const jsonChunk = JSON.parse(chunk);
	console.log("11:",chunk);
	console.log("22:",jsonChunk);
        switch (jsonChunk.msgType) {
          case recMsgType.telemetry:
            this.telemetryHandle(jsonChunk);
            break;
          default:
            console.log("Undefined msgType");
        }

          if (this.sendMsgBox.length == 0) {
            client.write(JSON.stringify({ msgType: sendMsgType.empty }));
          }
          else {
            while (this.sendMsgBox.length > 0) {
              let sendMsg = this.sendMsgBox.pop();
              client.write(sendMsg.getJson());
            }
          }

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
    this.humid= humid;
    this.decibel = decibel;
  }
  this.getData = () => {
    const temp = this.temp;
    const humid = this.humid;
    const decibel = this.decibel;
    return {temp, humid, decibel};
  }
}



module.exports = { IPCsocket, sendMsgType, recMsgType, SendMsg, mobileData };
