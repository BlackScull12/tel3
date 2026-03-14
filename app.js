/* ---------------- FIREBASE IMPORTS ---------------- */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
getAuth,
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
apiKey:"AIzaSyAxt94UyMn8AP8PFaSHPJ29JnZQ2KI3kZw",
authDomain:"chatgithub-e838d.firebaseapp.com",
projectId:"chatgithub-e838d",
storageBucket:"chatgithub-e838d.firebasestorage.app",
messagingSenderId:"755589384017",
appId:"1:755589384017:web:6af4c6d223d646cf36f570"
};


/* ---------------- INIT ---------------- */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


/* ---------------- DOM ---------------- */

const usersList = document.getElementById("usersList");
const chatBox = document.getElementById("chatBox");
const chatUser = document.getElementById("chatUser");

const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const emojiBtn = document.getElementById("emojiBtn");
const emojiPicker = document.getElementById("emojiPicker");

const uploadBtn = document.getElementById("uploadBtn");
const profileUpload = document.getElementById("profileUpload");
const myProfilePic = document.getElementById("myProfilePic");


/* ---------------- STATE ---------------- */

let currentUser=null;
let currentFriend=null;
let chatID=null;

let unsubscribeUsers=null;
let unsubscribeMessages=null;

const DEFAULT_PFP="https://i.imgur.com/HeIi0wU.png";


/* ---------------- AUTH ---------------- */

onAuthStateChanged(auth,async(user)=>{

if(!user) return;

currentUser=user;

const ref=doc(db,"users",user.uid);
const snap=await getDoc(ref);

let data;

if(!snap.exists()){

data={
name:user.displayName,
email:user.email,
photo:user.photoURL||DEFAULT_PFP,
videoPhoto:"",
online:true,
lastSeen:Date.now()
};

await setDoc(ref,data);

}else{

data=snap.data();

await updateDoc(ref,{online:true});

}

renderAvatar(myProfilePic,data.photo,data.videoPhoto);

loadUsers();

});


/* ---------------- ONLINE STATUS ---------------- */

window.addEventListener("beforeunload",async()=>{

if(!currentUser) return;

await updateDoc(doc(db,"users",currentUser.uid),{
online:false,
lastSeen:Date.now()
});

});


/* ---------------- PROFILE UPLOAD ---------------- */

if(uploadBtn){

uploadBtn.onclick=()=>profileUpload.click();

profileUpload.onchange=()=>{

const file=profileUpload.files[0];
if(!file) return;

const reader=new FileReader();

reader.onload=async(e)=>{

const base64=e.target.result;

if(file.type==="video/mp4"){

await updateDoc(doc(db,"users",currentUser.uid),{
videoPhoto:base64
});

renderAvatar(myProfilePic,"",base64);

}else{

await updateDoc(doc(db,"users",currentUser.uid),{
photo:base64,
videoPhoto:""
});

renderAvatar(myProfilePic,base64,"");

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

const v=document.createElement("video");

v.src=video;
v.autoplay=true;
v.loop=true;
v.muted=true;
v.playsInline=true;

container.appendChild(v);

}else{

const img=document.createElement("img");

img.src=image||DEFAULT_PFP;

img.onerror=()=>img.src=DEFAULT_PFP;

container.appendChild(img);

}

}


/* ---------------- LAST SEEN ---------------- */

function formatLastSeen(time){

if(!time) return "";

const d=new Date(time);

return "Last seen "+d.toLocaleDateString()+" "+d.toLocaleTimeString();

}


/* ---------------- LOAD USERS ---------------- */

function loadUsers(){

if(unsubscribeUsers) unsubscribeUsers();

unsubscribeUsers=onSnapshot(collection(db,"users"),async(snap)=>{

usersList.innerHTML="";

for(const docu of snap.docs){

if(docu.id===currentUser.uid) continue;

const user=docu.data();

let displayName=user.name;

/* nickname lookup */

try{

const nickRef=doc(db,"nicknames",currentUser.uid,"names",docu.id);
const nickSnap=await getDoc(nickRef);

if(nickSnap.exists()){
displayName=nickSnap.data().nickname;
}

}catch(e){}

/* row */

const row=document.createElement("div");
row.className="userRow";


/* avatar */

const avatar=document.createElement("div");
avatar.className="userAvatarBox";

renderAvatar(avatar,user.photo,user.videoPhoto);


/* status */

const status=document.createElement("div");
status.className="statusDot";

status.style.background=user.online?"limegreen":"gray";


/* name */

const name=document.createElement("div");
name.textContent=displayName;


/* last seen */

const last=document.createElement("div");
last.className="lastSeen";

last.textContent=user.online?"Online":formatLastSeen(user.lastSeen);


const textWrap=document.createElement("div");

textWrap.appendChild(name);
textWrap.appendChild(last);


/* nickname edit */

row.ondblclick=async()=>{

const nick=prompt("Enter nickname");

if(!nick) return;

await setDoc(
doc(db,"nicknames",currentUser.uid,"names",docu.id),
{nickname:nick}
);

loadUsers();

};


/* open chat */

row.onclick=()=>openChat(docu.id,displayName);


row.appendChild(avatar);
row.appendChild(status);
row.appendChild(textWrap);

usersList.appendChild(row);

}

});

}


/* ---------------- OPEN CHAT ---------------- */

function openChat(uid,name){

currentFriend=uid;

chatID=[currentUser.uid,uid].sort().join("_");

chatUser.textContent=name;

listenMessages();

}


/* ---------------- LISTEN MESSAGES ---------------- */

function listenMessages(){

if(unsubscribeMessages) unsubscribeMessages();

const q=query(
collection(db,"chats",chatID,"messages"),
orderBy("time")
);

unsubscribeMessages=onSnapshot(q,(snap)=>{

chatBox.innerHTML="";

snap.forEach(docu=>{

const m=docu.data();

const msg=document.createElement("div");

msg.className="message "+(m.sender===currentUser.uid?"sender":"receiver");


/* avatar */

const avatar=document.createElement("div");
avatar.className="msgAvatarBox";

renderAvatar(avatar,m.photo,m.videoPhoto);


/* bubble */

const bubble=document.createElement("div");
bubble.className="bubble";


/* text */

const text=document.createElement("div");
text.className="messageText";

text.textContent=m.text;


/* time */

const time=document.createElement("div");
time.className="messageTime";

time.textContent=new Date(m.time).toLocaleTimeString();


bubble.appendChild(text);
bubble.appendChild(time);

msg.appendChild(avatar);
msg.appendChild(bubble);

chatBox.appendChild(msg);

});

chatBox.scrollTop=chatBox.scrollHeight;

});

}


/* ---------------- SEND MESSAGE ---------------- */

async function sendMessage(){

if(!chatID) return;

const text=messageInput.value.trim();

if(!text) return;

const snap=await getDoc(doc(db,"users",currentUser.uid));
const data=snap.data();

await addDoc(collection(db,"chats",chatID,"messages"),{

text:text,
sender:currentUser.uid,
photo:data.photo||DEFAULT_PFP,
videoPhoto:data.videoPhoto||"",
time:Date.now()

});

messageInput.value="";

}


if(sendBtn) sendBtn.onclick=sendMessage;

messageInput.addEventListener("keydown",(e)=>{

if(e.key==="Enter") sendMessage();

});


/* ---------------- EMOJI DROPPER ---------------- */

const emojis=[
"😀","😂","🤣","😍","😎","😭","😡","👍","🔥","❤️","🎉","😅","😆","😁","🤔","😇","🥳","😜"
];

if(emojiBtn){

emojiBtn.onclick=()=>{

emojiPicker.style.display=
emojiPicker.style.display==="block"
?"none":"block";

};

}

/* build emoji list */

if(emojiPicker){

emojis.forEach(e=>{

const span=document.createElement("span");

span.textContent=e;

span.style.cursor="pointer";
span.style.fontSize="20px";
span.style.margin="5px";

span.onclick=()=>{

messageInput.value+=e;

emojiPicker.style.display="none";

};

emojiPicker.appendChild(span);

});

}
