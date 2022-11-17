const socket = io();

//const form = welcome.querySelector("form");
//const room = document.getElementById("room");
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const nick = document.getElementById("nick");
const msg = document.getElementById("msg");

const call = document.getElementById("call");
call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;

async function getCameras(){
    try{
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => (device.kind === "videoinput"));
        const currentCamera = myStream.getAudioTracks()[0];
        cameras.forEach((camera) => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if(currentCamera.label === camera.label) {
                option.selected = true;
            }
            camerasSelect.appendChild(option);
        });
    }catch(e){
        console.log(e);
    }
}

async function getMedia(deviceId){
    const initialConstrains = {
        audio:true,
        video:{facingMode : "user"},
    };
    const cameraConstrains ={
        audio:true,
        video : {deviceId : {exact :deviceId}}
    }
    try{
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId? cameraConstrains : initialConstrains
        );
        myFace.srcObject = myStream;
        if(!deviceId) {
            await getCameras();
        }
    } catch(e) {
        console.log(e);
    }
}


function handleMuteClick(){
    myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
    if(!muted){
        muteBtn.innerText="Unmute"
        muted = true;
    }else{
        muteBtn.innerText="Mute"
        muted = false;
    }
}
function handleCameraClick(){
    myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
    if(cameraOff) {
        cameraBtn.innerText ="Turn Camera OFF"
        cameraOff = false;
    }else{
        cameraBtn.innerText ="Turn Camera ON"
        cameraOff = true;
    }
}

async function handleCameraChange(){
    await getMedia(camerasSelect.value);
    if(myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection
            .getSenders()
            .find(sender => sender.track.kind ==="video");
        videoSender.replaceTrack()

    }
}

muteBtn.addEventListener("click",handleMuteClick);
cameraBtn.addEventListener("click",handleCameraClick);
camerasSelect.addEventListener("input",handleCameraChange);

//Welcome Form

const welcome = document.getElementById("welcome")
const welcomeForm = welcome.querySelector("form");

async function initCall() {
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}

async function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    await initCall();
    socket.emit("join_room", input.value);
    roomName = input.value;
    input.value = "";
}
welcomeForm.addEventListener("submit",handleWelcomeSubmit);


//Socket Code
socket.on("welcome",async () => {
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log("sent the offer");
    socket.emit("offer",offer,roomName);
})

socket.on("offer", async (offer) => {
    console.log("receive the offer");
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer,roomName);
    console.log("sent the offer");


})

socket.on("answer", answer => {
    console.log("receive the answer");
    myPeerConnection.setRemoteDescription(answer);
})

socket.on("ice",ice => {
    console.log("receive candidate");
    myPeerConnection.addIceCandidate(ice);
})


//RTC Code

function makeConnection() {
    myPeerConnection = new RTCPeerConnection({
        iceServers:[]
    });
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream",handleAddStream);
    myStream.getTracks().forEach(track => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
    console.log("sent candidate");
    socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
    const peersFace = document.getElementById("peersFace");
    peersFace.srcObject = data.stream;
}

room.hidden = true;

let nickName;

function addMessage(message){
    const ul = room.querySelector("ul")
    const li = document.createElement("li")
    li.innerText = message;
    ul.appendChild(li);
}

function handleMessageSubmit(event) {
    event.preventDefault();
    const input = room.querySelector("#msg input");
    const value = input.value;
    socket.emit("new_message", input.value, roomName, () => {
        addMessage(`You : ${value}`);
    });
    input.value="";

}

// function handleNicknameSubmit(event) {
//     event.preventDefault();
//     const input = room.querySelector("#name input");
//     socket.emit("nickName",input.value);
// }

function showRoom() {
    welcome.hidden = true;
    room.hidden = false;
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName}`;
    span = room.querySelector("span");
    span.innerText = `My nickname :  ${nickName}`;
    const msgForm = room.querySelector("#msg");
    //const nameForm = room.querySelector("#name");
    msgForm.addEventListener("submit",handleMessageSubmit);
    //msgForm.addEventListener("click",handleMessageSubmit);
    

    //nameForm.addEventListener("submit",handleNicknameSubmit);
}

function handleRoomSubmit(event) {
    event.preventDefault();
    // const input = form.querySelector("input");
    // socket.emit(
    //     "enter_room",
    //     input.value,
    //     showRoom);
    // roomName = input.value;
    // input.value="";
    const inputRoomname = nick.querySelector("#roomname");
    const inputNickname = nick.querySelector("#nickname");

    roomName = inputRoomname.value;
    nickName = inputNickname.value;

    console.log(roomName);
    console.log(nickName);

    socket.emit("enter_room",roomName, nickName,showRoom);
    // inputRoomname.value = "";
    // inputNickname.value ="";
}

nick.addEventListener("submit",handleRoomSubmit);

socket.on("welcome",(user, newCount) => {
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`;

    addMessage(`${user} arrived!`);
});

socket.on("bye", (left, newCount) => {
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`;

    addMessage(`${left} left ㅠㅠ`);
})

socket.on("new_message", addMessage);

// socket.on("room_change",(rooms) => {
//     const roomList = welcome.querySelector("ul");
//     roomList.innerHTML ="";
//     if(rooms.length === 0) {
//         return;
//     }
//     rooms.forEach(room => {
//         const li = document.createElement("li");
//         li.innerText = room;
//         roomList.append(li);
//     });
// });