import express from "express";
import http from "http";
import {Server} from "socket.io";
import { instrument } from "@socket.io/admin-ui";
//import WebSocket from "ws";

const app = express();

app.set("view engine","pug");
app.set("views",__dirname +"/views");
app.use("/public",express.static(__dirname + "/public"));
app.get("/",(_,res) => res.render("home"));
app.get("/*", (_,res) => res.redirect("/"));


//http, WEBSOCKET 둘다 작동
const httpServer = http.createServer(app);
const wsServer = new Server(httpServer, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true
      }
});
instrument(wsServer, {
    auth: false
  });
//const wss = new WebSocket.Server({ server });

function publicRooms() {
    const {
        sockets : {
        adapter : {sids, rooms},
        },
    } = wsServer;
    const publicRooms = [];
    rooms.forEach((_,key) => {
        if(sids.get(key) === undefined) {
            publicRooms.push(key);
        }
    });
    return publicRooms;
}

function countRoom(roomName) {
    return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection",(socket) => {
    //모든 소켓이 announcement 방에 입장하게 만든다.
    //wsServer.socketJoin("announcement");

    socket["nickname"] = "Anon";
    socket.onAny((event) => {
        console.log(wsServer.sockets.adapter);//
        console.log(`Socket Event : ${event}`);
    });
    socket.on("enter_room", (roomName,nickname, done) => {
        socket.join(roomName);     
        socket["nickname"] = nickname; 
        done();    
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
        wsServer.sockets.emit("room_change",publicRooms());
    });
    socket.on("disconnecting",() =>{
        socket.rooms.forEach(room => socket.to(room).emit("bye",socket.nickname,countRoom(room)-1));
    });
    socket.on("disconnect",() => {
        wsServer.sockets.emit("room_change",publicRooms());
    })
    socket.on("new_message", (msg,room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname} : ${msg}`);
        done();
    });
    //socket.on("nickname", (nickname) => (socket["nickname"] = nickname));
});

// function onSocketClose() {
//     console.log("Disconnected from the Browser X");
// }

//연결되어있는 socket의 정보들 ex)database
// const sockets = [];

// wss.on("connection",(socket) => {
//     sockets.push(socket);
//     socket["nickname"] = "Anon";
//     console.log("Connected to Browser");
//     socket.on("close", onSocketClose);
//     socket.on("message",(msg) => {
//         const message = JSON.parse(msg);
//         switch (message.type) {
//             case "new_message" :
//                 sockets.forEach((aSocket) => 
//                     aSocket.send(`${socket.nickname} : ${message.payload}`));
//             case "nickname" :
//                 socket["nickname"] = message.payload;
//         }
//     });
// });

const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(3000, handleListen);