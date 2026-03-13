/* FIREBASE IMPORTS */

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
getDocs,
addDoc,
query,
onSnapshot,
updateDoc,
orderBy
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";


/* FIREBASE CONFIG */

const firebaseConfig = {

apiKey: "YOUR_API_KEY",
authDomain: "YOUR_PROJECT.firebaseapp.com",
projectId: "YOUR_PROJECT",
storageBucket: "YOUR_PROJECT.appspot.com",
messagingSenderId: "XXXX",
appId: "XXXX"

};


/* INIT */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();


/* DOM */

const googleBtn = document.getElementById("googleLogin");
const usersList = document.getElementById("usersList");

const chatBox = document.getElementById("chatBox");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const chatUser = document.getElementById("chatUser");

const emojiBtn = document.getElementById("emojiBtn");
const gifBtn = document.getElementById("gifBtn");

const emojiPicker = document.getElementById("emojiPicker");
const gifPicker = document.getElementById("gifPicker");


/* STATE */

let currentUser = null;
let currentFriend = null;
let chatID = null;


/* LOGIN */

if(googleBtn){

googleBtn.onclick = async () => {

const res = await signInWithPopup(auth,provider);
const user = res.user;

await setDoc(doc(db,"users",user.uid),{

name:user.displayName,
email:user.email,
photo:user.photoURL,
online:true,
lastSeen:Date.now()

},{merge:true});

window.location="chat.html";

};

}


/* AUTH STATE */

onAuthStateChanged(auth, async(user)=>{

if(!user) return;

currentUser=user;

await updateDoc(doc(db,"users",user.uid),{
online:true
});

window.addEventListener("beforeunload",async()=>{

await updateDoc(doc(db,"users",user.uid),{
online:false,
lastSeen:Date.now()
});

});

loadUsers();

});


/* LOAD USERS */

async function loadUsers(){

if(!usersList) return;

usersList.innerHTML="";

const snap = await getDocs(collection(db,"users"));

snap.forEach(docu=>{

if(docu.id===currentUser.uid) return;

const user = docu.data();

const div = document.createElement("div");

div.className="userRow";

div.innerHTML = `
${user.name}
<span style="font-size:12px;color:gray">
${user.online?"🟢 Online":"Last seen "+new Date(user.lastSeen).toLocaleTimeString()}
</span>
`;

div.onclick=()=>openChat(docu.id,user.name);

usersList.appendChild(div);

});

}


/* OPEN CHAT */

function openChat(uid,name){

currentFriend = uid;
chatID = [currentUser.uid,uid].sort().join("_");

chatUser.innerText = name;

listenMessages();

}


/* LISTEN MESSAGES */

function listenMessages(){

const q = query(
collection(db,"chats",chatID,"messages"),
orderBy("time")
);

onSnapshot(q,(snap)=>{

chatBox.innerHTML="";

snap.forEach(d=>{

const m=d.data();

const div=document.createElement("div");

div.className="message "+(m.sender===currentUser.uid?"sender":"receiver");

div.innerHTML=`

<div class="reactionBar">
<span onclick="react('${d.id}','👍')">👍</span>
<span onclick="react('${d.id}','❤️')">❤️</span>
<span onclick="react('${d.id}','😂')">😂</span>
<span onclick="react('${d.id}','😮')">😮</span>
<span onclick="react('${d.id}','😢')">😢</span>
</div>

${m.text}

<div class="reactions">
${renderReactions(m.reactions)}
</div>

<div class="messageTime">
${new Date(m.time).toLocaleTimeString()}
</div>

`;

chatBox.appendChild(div);

});

chatBox.scrollTop = chatBox.scrollHeight;

});

}


/* RENDER REACTIONS */

function renderReactions(reactions){

if(!reactions) return "";

let counts={};

Object.values(reactions).forEach(e=>{

counts[e]=(counts[e]||0)+1;

});

let html="";

for(let e in counts){

html+=`${e} ${counts[e]} `;

}

return html;

}


/* REACT */

window.react = async function(messageId,emoji){

const ref = doc(db,"chats",chatID,"messages",messageId);

await updateDoc(ref,{
["reactions."+currentUser.uid]:emoji
});

};


/* SEND MESSAGE */

async function sendMessage(){

if(!input || !chatID) return;

if(!input.value.trim()) return;

await addDoc(collection(db,"chats",chatID,"messages"),{

text:input.value,
sender:currentUser.uid,
time:Date.now()

});

input.value="";

}


/* SEND BUTTON */

if(sendBtn){

sendBtn.onclick=sendMessage;

}


/* ENTER KEY */

if(input){

input.addEventListener("keypress",(e)=>{

if(e.key==="Enter"){

e.preventDefault();
sendMessage();

}

});

}


/* EMOJI PICKER */

if(emojiBtn){

emojiBtn.onclick=()=>{

emojiPicker.style.display =
emojiPicker.style.display==="block"?"none":"block";

gifPicker.style.display="none";

};

}


/* GIF PICKER */

if(gifBtn){

gifBtn.onclick=()=>{

gifPicker.style.display =
gifPicker.style.display==="block"?"none":"block";

emojiPicker.style.display="none";

};

}
