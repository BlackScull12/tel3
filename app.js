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
getDocs,
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
let unsubscribeMessages = null;


/* ---------------- LOGIN ---------------- */

if (googleBtn) {

googleBtn.onclick = async () => {

try {

const res = await signInWithPopup(auth, provider);
const user = res.user;

await setDoc(doc(db,"users",user.uid),{

name:user.displayName,
email:user.email,
photo:user.photoURL || ""

},{merge:true});

window.location = "chat.html";

}catch(err){
console.error("Login error:",err);
}

};

}


/* ---------------- AUTH ---------------- */

onAuthStateChanged(auth, async (user)=>{

if(!user) return;

currentUser = user;

try{

const snap = await getDoc(doc(db,"users",user.uid));

if(snap.exists()){

const data = snap.data();

const avatar =
data.photo ||
user.photoURL ||
"";

renderAvatar(myProfilePic,avatar);

}

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
if(!file || !currentUser) return;

if(!file.type.startsWith("image/")){
alert("Only image files allowed");
return;
}

const reader = new FileReader();

reader.onload = async (e)=>{

const base64 = e.target.result;

try{

await updateDoc(doc(db,"users",currentUser.uid),{
photo:base64
});

renderAvatar(myProfilePic,base64);
loadUsers();

}catch(err){
console.error("Upload error:",err);
}

};

reader.readAsDataURL(file);

};

}


/* ---------------- AVATAR RENDER ---------------- */

function renderAvatar(container,src){

if(!container) return;

container.innerHTML = `
<img class="profilePic" src="${src}">
`;

}


/* ---------------- LOAD USERS ---------------- */

async function loadUsers(){

if(!usersList || !currentUser) return;

usersList.innerHTML = "";

try{

const snap = await getDocs(collection(db,"users"));

snap.forEach(docu=>{

if(docu.id === currentUser.uid) return;

const user = docu.data();

const avatar =
user.photo ||
user.photoURL ||
"";

const div = document.createElement("div");
div.className = "userRow";

div.innerHTML = `
<img class="userAvatar" src="${avatar}">
<b>${user.name || "User"}</b>
`;

div.onclick = ()=> openChat(docu.id,user.name);

usersList.appendChild(div);

});

}catch(err){
console.error(err);
}

}


/* ---------------- OPEN CHAT ---------------- */

function openChat(uid,name){

if(!currentUser) return;

currentFriend = uid;
chatID = [currentUser.uid,uid].sort().join("_");

if(chatUser) chatUser.innerText = name;

if(unsubscribeMessages) unsubscribeMessages();

listenMessages();

}


/* ---------------- LISTEN MESSAGES ---------------- */

function listenMessages(){

if(!chatBox || !chatID) return;

const q = query(
collection(db,"chats",chatID,"messages"),
orderBy("time")
);

unsubscribeMessages = onSnapshot(q,(snap)=>{

chatBox.innerHTML = "";

snap.forEach(d=>{

const m = d.data();
const id = d.id;

const avatar = m.photo || "";

const div = document.createElement("div");

div.className =
"message " + (m.sender===currentUser.uid?"sender":"receiver");

div.innerHTML = `

<img class="msgAvatar" src="${avatar}">

<div class="msgBubble">

${m.text || ""}

<div class="reactionBar">

<span onclick="react('${id}','👍')">👍</span>
<span onclick="react('${id}','❤️')">❤️</span>
<span onclick="react('${id}','😂')">😂</span>
<span onclick="react('${id}','😮')">😮</span>
<span onclick="react('${id}','😢')">😢</span>

</div>

<div class="reactions">
${renderReactions(m.reactions)}
</div>

<div class="messageTime">
${new Date(m.time || Date.now()).toLocaleTimeString()}
</div>

</div>
`;

chatBox.appendChild(div);

});

chatBox.scrollTop = chatBox.scrollHeight;

});

}


/* ---------------- REACTIONS ---------------- */

function renderReactions(reactions){

if(!reactions) return "";

let counts = {};

Object.values(reactions).forEach(e=>{
counts[e]=(counts[e]||0)+1;
});

let html="";

for(let e in counts){
html += `${e} ${counts[e]} `;
}

return html;

}

window.react = async (id,emoji)=>{

if(!chatID || !currentUser) return;

try{

const ref = doc(db,"chats",chatID,"messages",id);

await updateDoc(ref,{
["reactions."+currentUser.uid]:emoji
});

}catch(err){
console.error(err);
}

};


/* ---------------- SEND MESSAGE ---------------- */

async function sendMessage(){

if(!chatID || !input) return;

const text = input.value.trim();
if(!text) return;

try{

const snap = await getDoc(doc(db,"users",currentUser.uid));
const data = snap.data();

const avatar =
data.photo ||
currentUser.photoURL ||
"";

await addDoc(collection(db,"chats",chatID,"messages"),{

text:text,
sender:currentUser.uid,
photo:avatar,
reactions:{},
time:Date.now()

});

input.value="";

}catch(err){
console.error(err);
}

}

if(sendBtn) sendBtn.onclick = sendMessage;

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

emojiBtn.onclick = ()=>{

emojiPicker.style.display =
emojiPicker.style.display==="block"?"none":"block";

};

}

if(window.EmojiMart && emojiPicker && input){

const picker = new EmojiMart.Picker({

onEmojiSelect:(emoji)=>{
input.value += emoji.native;
}

});

emojiPicker.appendChild(picker);
emojiPicker.style.display="none";

}
