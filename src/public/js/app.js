const socket = io();

const welcome = document.getElementById("welcome")
const form = welcome.querySelector("form");
const room = document.getElementById("room");
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");

let myStream;
let muted = false;
let cameraOff = false;

async function getCameras(){
    try{
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => (device.kind === "videoinput"));
        cameras.forEach((camera) => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            camerasSelect.appendChild(option);
        });
    }catch(e){
        console.log(e);
    }
}

async function getMedia(){
    try{
        myStream = await navigator.mediaDevices.getUserMedia({
            audio:true,
            video:true,
        });
        myFace.srcObject = myStream;
        await getCameras();
    } catch(e) {
        console.log(e);
    }
}

getMedia();

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

muteBtn.addEventListener("click",handleMuteClick);
cameraBtn.addEventListener("click",handleCameraClick);

room.hidden = true;

let roomName,nickName;

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
    const inputRoomname = form.querySelector("#roomname");
    const inputNickname = form.querySelector("#nickname");

    roomName = inputRoomname.value;
    nickName = inputNickname.value;

    socket.emit("enter_room",roomName, nickName,showRoom);
    inputRoomname.value = "";
    inputNickname.value ="";
}

form.addEventListener("submit",handleRoomSubmit);

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

socket.on("room_change",(rooms) => {
    const roomList = welcome.querySelector("ul");
    roomList.innerHTML ="";
    if(rooms.length === 0) {
        return;
    }
    rooms.forEach(room => {
        const li = document.createElement("li");
        li.innerText = room;
        roomList.append(li);
    });
});