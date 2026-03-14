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
const provider = new GoogleAuthProvider();


/* ---------------- DEFAULT PFP ---------------- */

const DEFAULT_PFP = "https://i.imgur.com/HeIi0wU.png";


/* ---------------- DOM ---------------- */

const googleBtn = document.getElementById("googleLogin");

const usersList = document.getElementById("usersList");
const chatBox = document.getElementById("chatBox");
const chatUser = document.getElementById("chatUser");

const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

const emojiBtn = document.getElementById("emojiBtn");
const emojiPicker = document.getElementById("emojiPicker");

const profileUpload = document.getElementById("profileUpload");
const uploadBtn = document.getElementById("uploadBtn");
const myProfilePic = document.getElementById("myProfilePic");


/* ---------------- STATE ---------------- */

let currentUser = null;
let currentFriend = null;
let chatID = null;

let unsubscribeUsers = null;
let unsubscribeMessages = null;


/* ---------------- LOGIN ---------------- */

if (googleBtn) {

googleBtn.onclick = async () => {

try{

const res = await signInWithPopup(auth, provider);
const user = res.user;

await setDoc(doc(db,"users",user.uid),{
name:user.displayName || "User",
email:user.email || "",
photo:user.photoURL || DEFAULT_PFP,
videoPhoto:""
},{merge:true});

window.location = "chat.html";

}catch(err){

console.error("Login error:",err);
alert("Login failed");

}

};

}


/* ---------------- AUTH ---------------- */

onAuthStateChanged(auth, async (user)=>{

if(!user) return;

currentUser = user;

try{

const ref = doc(db,"users",user.uid);

const snap = await getDoc(ref);

let data={};

if(!snap.exists()){

data={
name:user.displayName || "User",
email:user.email || "",
photo:user.photoURL || DEFAULT_PFP,
videoPhoto:""
};

await setDoc(ref,data);

}else{
data=snap.data();
}

renderAvatar(
myProfilePic,
data.photo || DEFAULT_PFP,
data.videoPhoto || ""
);

loadUsers();

}catch(err){
console.error(err);
}

});


/* ---------------- PROFILE UPLOAD ---------------- */

if(uploadBtn && profileUpload){

uploadBtn.onclick = ()=> profileUpload.click();

profileUpload.onchange = ()=>{

const file = profileUpload.files[0];
if(!file) return;

/* file size limit (2MB) */

if(file.size > 2*1024*1024){
alert("File too large (max 2MB)");
return;
}

const reader = new FileReader();

reader.onload = async (e)=>{

const base64 = e.target.result;

try{

const ref = doc(db,"users",currentUser.uid);

if(file.type==="video/mp4"){

await updateDoc(ref,{videoPhoto:base64});

renderAvatar(myProfilePic,"",base64);

}else if(file.type.startsWith("image/")){

await updateDoc(ref,{
photo:base64,
videoPhoto:""
});

renderAvatar(myProfilePic,base64,"");

}else{

alert("Only image or MP4 allowed");

}

}catch(err){
console.error("Upload error:",err);
}

};

reader.readAsDataURL(file);

};

}


/* ---------------- AVATAR RENDER ---------------- */

function renderAvatar(container,image,video){

if(!container) return;

container.innerHTML="";

if(video && video.length>20){

const vid=document.createElement("video");

vid.src=video;
vid.autoplay=true;
vid.loop=true;
vid.muted=true;
vid.playsInline=true;

vid.style.width="100%";
vid.style.height="100%";
vid.style.objectFit="cover";

container.appendChild(vid);

}else{

const img=document.createElement("img");

img.src=image || DEFAULT_PFP;

img.onerror=()=>{
img.src=DEFAULT_PFP;
};

img.style.width="100%";
img.style.height="100%";
img.style.objectFit="cover";

container.appendChild(img);

}

}


/* ---------------- LOAD USERS ---------------- */

function loadUsers(){

if(!usersList) return;

if(unsubscribeUsers) unsubscribeUsers();

unsubscribeUsers = onSnapshot(collection(db,"users"),(snap)=>{

usersList.innerHTML="";

snap.forEach(docu=>{

if(docu.id===currentUser.uid) return;

const user=docu.data() || {};

const row=document.createElement("div");
row.className="userRow";

const avatar=document.createElement("div");
avatar.className="userAvatarBox";

renderAvatar(
avatar,
user.photo || DEFAULT_PFP,
user.videoPhoto || ""
);

const name=document.createElement("span");
name.textContent=user.name || "User";

row.appendChild(avatar);
row.appendChild(name);

row.onclick=()=>openChat(docu.id,user.name);

usersList.appendChild(row);

});

});

}


/* ---------------- OPEN CHAT ---------------- */

function openChat(uid,name){

currentFriend=uid;

chatID=[currentUser.uid,uid].sort().join("_");

if(chatUser) chatUser.textContent=name;

if(unsubscribeMessages) unsubscribeMessages();

listenMessages();

}


/* ---------------- LISTEN MESSAGES ---------------- */

function listenMessages(){

if(!chatBox) return;

const q=query(
collection(db,"chats",chatID,"messages"),
orderBy("time")
);

unsubscribeMessages=onSnapshot(q,(snap)=>{

chatBox.innerHTML="";

snap.forEach(d=>{

const m=d.data();

const msg=document.createElement("div");

msg.className=
"message "+(m.sender===currentUser.uid?"sender":"receiver");


const avatar=document.createElement("div");
avatar.className="msgAvatarBox";

renderAvatar(
avatar,
m.photo || DEFAULT_PFP,
m.videoPhoto || ""
);

const bubble=document.createElement("div");
bubble.className="msgBubble";

const text=document.createElement("div");
text.className="msgText";
text.textContent=m.text || "";

const time=document.createElement("div");
time.className="messageTime";

const date=m.time ? new Date(m.time) : new Date();

time.textContent=date.toLocaleTimeString();

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

if(!input || !currentUser || !chatID) return;

const text=input.value.trim();

if(!text) return;

try{

const snap=await getDoc(doc(db,"users",currentUser.uid));

const data=snap.data() || {};

await addDoc(collection(db,"chats",chatID,"messages"),{

text:text,
sender:currentUser.uid,
photo:data.photo || DEFAULT_PFP,
videoPhoto:data.videoPhoto || "",
time:Date.now()

});

input.value="";

}catch(err){
console.error("Send error:",err);
}

}


if(sendBtn) sendBtn.onclick=sendMessage;

if(input){

input.addEventListener("keydown",(e)=>{

if(e.key==="Enter"){
e.preventDefault();
sendMessage();
}

});

}


/* ---------------- EMOJI PICKER ---------------- */

if(emojiBtn && emojiPicker){

emojiBtn.onclick=()=>{

emojiPicker.style.display=
emojiPicker.style.display==="block"
? "none"
: "block";

};

}


/* ---------------- EMOJI LIBRARY ---------------- */

if(window.EmojiMart && emojiPicker){

const picker=new EmojiMart.Picker({

onEmojiSelect:(emoji)=>{
if(input) input.value += emoji.native;
}

});

emojiPicker.appendChild(picker);
emojiPicker.style.display="none";

}
