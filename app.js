/* ---------------- FIREBASE IMPORTS ---------------- */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
getAuth,
GoogleAuthProvider,
signInWithPopup,
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
getFirestore,
collection,
doc,
setDoc,
getDoc,
addDoc,
updateDoc,
query,
orderBy,
onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";


/* ---------------- FIREBASE CONFIG ---------------- */

const firebaseConfig = {
apiKey: "AIzaSyAxt94UyMn8AP8PFaSHPJ29JnZQ2KI3kZw",
authDomain: "chatgithub-e838d.firebaseapp.com",
projectId: "chatgithub-e838d",
storageBucket: "chatgithub-e838d.firebasestorage.app",
messagingSenderId: "755589384017",
appId: "1:755589384017:web:6af4c6d223d646cf36f570"
};


/* ---------------- INIT ---------------- */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


/* ---------------- DOM ---------------- */

const usersList = document.getElementById("usersList");
const chatBox = document.getElementById("chatBox");
const chatUser = document.getElementById("chatUser");

const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const uploadBtn = document.getElementById("uploadBtn");
const profileUpload = document.getElementById("profileUpload");
const myProfilePic = document.getElementById("myProfilePic");


/* ---------------- STATE ---------------- */

let currentUser = null;
let currentFriend = null;
let chatID = null;

let unsubscribeUsers = null;
let unsubscribeMessages = null;

const DEFAULT_PFP = "https://i.imgur.com/HeIi0wU.png";


/* ---------------- AUTH ---------------- */

onAuthStateChanged(auth, async (user)=>{

if(!user) return;

currentUser = user;

const ref = doc(db,"users",user.uid);
const snap = await getDoc(ref);

let data;

if(!snap.exists()){

data = {
name:user.displayName,
email:user.email,
photo:user.photoURL || DEFAULT_PFP,
videoPhoto:"",
online:true,
lastSeen:Date.now()
};

await setDoc(ref,data);

}else{

data = snap.data();

await updateDoc(ref,{
online:true
});

}

/* render profile */

renderAvatar(
myProfilePic,
data.photo || DEFAULT_PFP,
data.videoPhoto || ""
);

/* load users */

loadUsers();

});


/* ---------------- ONLINE STATUS ---------------- */

window.addEventListener("beforeunload", async ()=>{

if(!currentUser) return;

try{

await updateDoc(doc(db,"users",currentUser.uid),{
online:false,
lastSeen:Date.now()
});

}catch(e){}

});


/* ---------------- PROFILE UPLOAD ---------------- */

if(uploadBtn){

uploadBtn.onclick = ()=>profileUpload.click();

profileUpload.onchange = ()=>{

const file = profileUpload.files[0];

if(!file) return;

if(file.size > 2 * 1024 * 1024){

alert("File must be under 2MB");
return;

}

const reader = new FileReader();

reader.onload = async (e)=>{

const base64 = e.target.result;

const ref = doc(db,"users",currentUser.uid);

try{

if(file.type === "video/mp4"){

await updateDoc(ref,{videoPhoto:base64});

renderAvatar(myProfilePic,"",base64);

}else{

await updateDoc(ref,{
photo:base64,
videoPhoto:""
});

renderAvatar(myProfilePic,base64,"");

}

}catch(err){

console.error(err);

}

};

reader.readAsDataURL(file);

};

}


/* ---------------- AVATAR RENDER ---------------- */

function renderAvatar(container,image,video){

if(!container) return;

container.innerHTML="";

if(video){

const vid=document.createElement("video");

vid.src=video;
vid.autoplay=true;
vid.loop=true;
vid.muted=true;
vid.playsInline=true;

container.appendChild(vid);

}else{

const img=document.createElement("img");

img.src=image || DEFAULT_PFP;

img.onerror=()=>{
img.src=DEFAULT_PFP;
};

container.appendChild(img);

}

}


/* ---------------- LAST SEEN FORMAT ---------------- */

function formatLastSeen(time){

if(!time) return "";

const d = new Date(time);

return "Last seen " + d.toLocaleDateString() + " " + d.toLocaleTimeString();

}


/* ---------------- LOAD USERS ---------------- */

function loadUsers(){

if(unsubscribeUsers) unsubscribeUsers();

unsubscribeUsers = onSnapshot(collection(db,"users"), async (snap)=>{

usersList.innerHTML="";

for(const docu of snap.docs){

if(docu.id === currentUser.uid) continue;

const user = docu.data();

let displayName = user.name;

/* nickname lookup */

try{

const nickRef = doc(db,"nicknames",currentUser.uid,"names",docu.id);
const nickSnap = await getDoc(nickRef);

if(nickSnap.exists()){
displayName = nickSnap.data().nickname;
}

}catch(e){}


/* create row */

const row = document.createElement("div");
row.className="userRow";


/* avatar */

const avatar = document.createElement("div");
avatar.className="userAvatarBox";

renderAvatar(
avatar,
user.photo || DEFAULT_PFP,
user.videoPhoto || ""
);


/* status */

const status = document.createElement("div");
status.className="statusDot";

status.style.background = user.online ? "limegreen" : "gray";


/* name */

const name = document.createElement("div");
name.textContent = displayName;


/* last seen */

const last = document.createElement("div");
last.className="lastSeen";

if(user.online){
last.textContent="Online";
}else{
last.textContent=formatLastSeen(user.lastSeen);
}

const text = document.createElement("div");

text.appendChild(name);
text.appendChild(last);


/* nickname edit */

row.ondblclick = async ()=>{

const nick = prompt("Enter nickname");

if(!nick) return;

await setDoc(
doc(db,"nicknames",currentUser.uid,"names",docu.id),
{nickname:nick}
);

loadUsers();

};


/* open chat */

row.onclick = ()=>openChat(docu.id,displayName);


row.appendChild(avatar);
row.appendChild(status);
row.appendChild(text);

usersList.appendChild(row);

}

});

}


/* ---------------- OPEN CHAT ---------------- */

function openChat(uid,name){

currentFriend = uid;

chatID = [currentUser.uid,uid].sort().join("_");

chatUser.textContent = name;

listenMessages();

}


/* ---------------- MESSAGES ---------------- */

function listenMessages(){

if(unsubscribeMessages) unsubscribeMessages();

const q = query(
collection(db,"chats",chatID,"messages"),
orderBy("time")
);

unsubscribeMessages = onSnapshot(q,(snap)=>{

chatBox.innerHTML="";

snap.forEach(d=>{

const m = d.data();

const msg = document.createElement("div");

msg.className = m.sender === currentUser.uid
? "message sender"
: "message receiver";


/* avatar */

const avatar = document.createElement("div");
avatar.className="msgAvatarBox";

renderAvatar(
avatar,
m.photo || DEFAULT_PFP,
m.videoPhoto || ""
);


/* bubble */

const bubble = document.createElement("div");
bubble.className="bubble";

bubble.textContent = m.text;


/* time */

const time = document.createElement("div");
time.className="msgTime";

time.textContent = new Date(m.time).toLocaleTimeString();


msg.appendChild(avatar);
msg.appendChild(bubble);
msg.appendChild(time);

chatBox.appendChild(msg);

});

chatBox.scrollTop = chatBox.scrollHeight;

});

}


/* ---------------- SEND MESSAGE ---------------- */

async function sendMessage(){

if(!input || !chatID) return;

const text = input.value.trim();

if(!text) return;

const snap = await getDoc(doc(db,"users",currentUser.uid));

const data = snap.data() || {};

await addDoc(collection(db,"chats",chatID,"messages"),{

text:text,
sender:currentUser.uid,
photo:data.photo || DEFAULT_PFP,
videoPhoto:data.videoPhoto || "",
time:Date.now()

});

input.value="";

}


if(sendBtn) sendBtn.onclick = sendMessage;

if(input){

input.addEventListener("keydown",(e)=>{

if(e.key==="Enter"){
sendMessage();
}

});

}    
