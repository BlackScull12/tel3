
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
orderBy,
getDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";


/* FIREBASE CONFIG */

const firebaseConfig = {
apiKey: "AIzaSyAxt94UyMn8AP8PFaSHPJ29JnZQ2KI3kZw",
authDomain: "chatgithub-e838d.firebaseapp.com",
projectId: "chatgithub-e838d",
storageBucket: "chatgithub-e838d.firebasestorage.app",
messagingSenderId: "755589384017",
appId: "1:755589384017:web:6af4c6d223d646cf36f570"
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

const nicknameBtn = document.getElementById("nicknameBtn");


/* STATE */

let currentUser = null;
let currentFriend = null;
let chatID = null;
let unsubscribeMessages = null;


/* LOGIN */

if (googleBtn) {

googleBtn.onclick = async () => {

try {

const res = await signInWithPopup(auth, provider);
const user = res.user;

await setDoc(doc(db,"users",user.uid),{
name:user.displayName,
email:user.email,
online:true,
lastSeen:Date.now()
},{merge:true});

window.location="chat.html";

} catch(err){
console.error("Login error",err);
}

};

}


/* AUTH STATE */

onAuthStateChanged(auth, async (user) => {

if(!user) return;

currentUser = user;

await setDoc(doc(db,"users",user.uid),{
online:true
},{merge:true});

window.addEventListener("beforeunload", async () => {

await setDoc(doc(db,"users",user.uid),{
online:false,
lastSeen:Date.now()
},{merge:true});

});

loadUsers();

});


/* LOAD USERS */

async function loadUsers(){

if(!usersList) return;

usersList.innerHTML="";

const snap = await getDocs(collection(db,"users"));

snap.forEach(docu => {

if(docu.id === currentUser.uid) return;

const user = docu.data();

const div = document.createElement("div");
div.className="userRow";

div.innerHTML = `
${user.name}
<span style="font-size:12px;color:gray">
${user.online ? "🟢 Online" : "Last seen "+new Date(user.lastSeen).toLocaleTimeString()}
</span>
`;

div.onclick = () => openChat(docu.id,user.name);

usersList.appendChild(div);

});

}


/* OPEN CHAT */

async function openChat(uid,name){

currentFriend = uid;
chatID = [currentUser.uid,uid].sort().join("_");

loadNickname(name);

if(unsubscribeMessages) unsubscribeMessages();

listenMessages();

}


/* LOAD NICKNAME */

async function loadNickname(defaultName){

if(!chatUser) return;

const ref = doc(db,"chats",chatID);
const snap = await getDoc(ref);

if(snap.exists()){

const data = snap.data();

if(data.nicknames && data.nicknames[currentFriend]){

chatUser.innerText = data.nicknames[currentFriend];
return;

}

}

chatUser.innerText = defaultName;

}


/* CHANGE NICKNAME */

if(nicknameBtn){

nicknameBtn.onclick = async () => {

if(!chatID) return;

const name = prompt("Enter nickname:");

if(!name) return;

await setDoc(doc(db,"chats",chatID),{
nicknames:{[currentFriend]:name}
},{merge:true});

chatUser.innerText = name;

};

}


/* LISTEN MESSAGES */

function listenMessages(){

const q = query(
collection(db,"chats",chatID,"messages"),
orderBy("time")
);

unsubscribeMessages = onSnapshot(q,(snap)=>{

chatBox.innerHTML="";

snap.forEach(d=>{

const m = d.data();
const div = document.createElement("div");

div.className="message "+(m.sender===currentUser.uid?"sender":"receiver");

let content = m.text;

if(content && content.includes("<img")){
div.innerHTML = content;
}else{
div.textContent = content;
}

div.innerHTML += `

<div class="reactionBar">
<span onclick="react('${d.id}','👍')">👍</span>
<span onclick="react('${d.id}','❤️')">❤️</span>
<span onclick="react('${d.id}','😂')">😂</span>
<span onclick="react('${d.id}','😮')">😮</span>
<span onclick="react('${d.id}','😢')">😢</span>
</div>

<div class="reactions">${renderReactions(m.reactions)}</div>

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

if(!chatID) return;

const ref = doc(db,"chats",chatID,"messages",messageId);

await updateDoc(ref,{
["reactions."+currentUser.uid]:emoji
});

};


/* SEND MESSAGE */

async function sendMessage(){

if(!input || !chatID) return;

const text = input.value.trim();

if(!text) return;

await addDoc(collection(db,"chats",chatID,"messages"),{
text:text,
sender:currentUser.uid,
time:Date.now()
});

input.value="";

}


/* SEND BUTTON */

if(sendBtn){
sendBtn.onclick = sendMessage;
}


/* ENTER KEY SEND */

if(input){

input.addEventListener("keydown",(e)=>{

if(e.key==="Enter"){
e.preventDefault();
sendMessage();
}

});

}


/* EMOJI PICKER */

if(emojiPicker){

const picker = new EmojiMart.Picker({
onEmojiSelect:(emoji)=>{
input.value += emoji.native;
}
});

emojiPicker.appendChild(picker);
emojiPicker.style.display="none";

}


/* EMOJI BUTTON */

if(emojiBtn){

emojiBtn.onclick = () => {

emojiPicker.style.display =
emojiPicker.style.display==="block" ? "none" : "block";

gifPicker.style.display="none";

};

}


/* GIF DATA */

const gifs = [
"https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif",
"https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif",
"https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
"https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif",
"https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif"
];


/* GIF PICKER */

if(gifPicker){

gifPicker.style.display="none";

gifs.forEach(url=>{

const img=document.createElement("img");

img.src=url;
img.style.width="100px";
img.style.cursor="pointer";

img.onclick=async()=>{

if(!chatID) return;

await addDoc(collection(db,"chats",chatID,"messages"),{
text:`<img src="${url}" style="max-width:200px;border-radius:10px;">`,
sender:currentUser.uid,
time:Date.now()
});

gifPicker.style.display="none";

};

gifPicker.appendChild(img);

});

}


/* GIF BUTTON */

if(gifBtn){

gifBtn.onclick=()=>{

gifPicker.style.display =
gifPicker.style.display==="block"?"none":"block";

emojiPicker.style.display="none";

};

}


/* CLOSE PICKERS WHEN CLICKING OUTSIDE */

document.addEventListener("click",(e)=>{

if(!emojiPicker.contains(e.target) && e.target!==emojiBtn){
emojiPicker.style.display="none";
}

if(!gifPicker.contains(e.target) && e.target!==gifBtn){
gifPicker.style.display="none";
}

});
