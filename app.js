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
let unsubscribeMessages = null;


/* ---------------- LOGIN ---------------- */

if (googleBtn) {

googleBtn.onclick = async () => {

try{

const res = await signInWithPopup(auth, provider);
const user = res.user;

await setDoc(doc(db,"users",user.uid),{

name:user.displayName,
email:user.email,
photo:user.photoURL || DEFAULT_PFP,
videoPhoto:""

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

let avatar = DEFAULT_PFP;
let videoAvatar = "";

if(snap.exists()){

const data = snap.data();

avatar = data.photo || user.photoURL || DEFAULT_PFP;
videoAvatar = data.videoPhoto || "";

}

renderAvatar(myProfilePic, avatar, videoAvatar);

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

const reader = new FileReader();

reader.onload = async (e)=>{

const base64 = e.target.result;

try{

const ref = doc(db,"users",currentUser.uid);

if(file.type === "video/mp4"){

await updateDoc(ref,{
videoPhoto:base64
});

renderAvatar(myProfilePic,"",base64);

}else if(file.type.startsWith("image/")){

await updateDoc(ref,{
photo:base64,
videoPhoto:""
});

renderAvatar(myProfilePic,base64,"");

}else{

alert("Only MP4 or image files allowed");
}

loadUsers();

}catch(err){
console.error(err);
}

};

reader.readAsDataURL(file);

};

}


/* ---------------- RENDER AVATAR ---------------- */

function renderAvatar(container,image,video){

if(!container) return;

if(video){

container.innerHTML = `
<video class="profilePic" autoplay loop muted playsinline>
<source src="${video}" type="video/mp4">
</video>
`;

}else{

container.innerHTML = `
<img class="profilePic" src="${image || DEFAULT_PFP}" 
onerror="this.src='${DEFAULT_PFP}'">
`;

}

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

const avatar = user.photo || DEFAULT_PFP;
const videoAvatar = user.videoPhoto || "";

let avatarHTML;

if(videoAvatar){

avatarHTML = `
<video class="userAvatar" autoplay loop muted playsinline>
<source src="${videoAvatar}" type="video/mp4">
</video>
`;

}else{

avatarHTML = `
<img class="userAvatar" src="${avatar}" 
onerror="this.src='${DEFAULT_PFP}'">
`;

}

const div = document.createElement("div");
div.className = "userRow";

div.innerHTML = `
${avatarHTML}
<b>${user.name || "User"}</b>
`;

div.onclick = ()=> openChat(docu.id,user.name || "User");

usersList.appendChild(div);

});

}catch(err){
console.error(err);
}

}


/* ---------------- OPEN CHAT ---------------- */

function openChat(uid,name){

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

let avatarHTML;

if(m.videoPhoto){

avatarHTML = `
<video class="msgAvatar" autoplay loop muted playsinline>
<source src="${m.videoPhoto}" type="video/mp4">
</video>
`;

}else{

avatarHTML = `
<img class="msgAvatar" src="${m.photo || DEFAULT_PFP}"
onerror="this.src='${DEFAULT_PFP}'">
`;

}

const div = document.createElement("div");

div.className =
"message " + (m.sender===currentUser.uid?"sender":"receiver");

div.innerHTML = `

${avatarHTML}

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
const data = snap.data() || {};

await addDoc(collection(db,"chats",chatID,"messages"),{

text:text,
sender:currentUser.uid,
photo:data.photo || DEFAULT_PFP,
videoPhoto:data.videoPhoto || "",
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
