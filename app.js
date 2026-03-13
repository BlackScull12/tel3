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

const res = await signInWithPopup(auth, provider);
const user = res.user;

await setDoc(doc(db,"users",user.uid),{

name:user.displayName,
email:user.email,
photo:user.photoURL || "",
videoPhoto:""

},{merge:true});

window.location = "chat.html";

};

}


/* ---------------- AUTH ---------------- */

onAuthStateChanged(auth, async (user)=>{

if(!user) return;

currentUser = user;

const snap = await getDoc(doc(db,"users",user.uid));

if(snap.exists()){

const data = snap.data();

const avatar =
data.videoPhoto ||
data.photo ||
user.photoURL;

renderAvatar(myProfilePic,avatar);

}

loadUsers();

});


/* ---------------- PROFILE UPLOAD ---------------- */

if(uploadBtn && profileUpload){

uploadBtn.onclick = ()=> profileUpload.click();

profileUpload.onchange = ()=>{

const file = profileUpload.files[0];
if(!file) return;

const reader = new FileReader();

reader.onload = async (e)=>{

const base64 = e.target.result;

const ref = doc(db,"users",currentUser.uid);

if(file.type === "video/mp4"){

await updateDoc(ref,{
videoPhoto:base64,
photo:""
});

}else{

await updateDoc(ref,{
photo:base64,
videoPhoto:""
});

}

renderAvatar(myProfilePic,base64);

loadUsers();

};

reader.readAsDataURL(file);

};

}


/* ---------------- AVATAR RENDER ---------------- */

function renderAvatar(container,src){

if(!container) return;

if(src && src.startsWith("data:video")){

container.outerHTML = `
<video class="profilePic" autoplay loop muted>
<source src="${src}" type="video/mp4">
</video>
`;

}else{

container.outerHTML = `
<img class="profilePic" src="${src}">
`;

}

}


/* ---------------- LOAD USERS ---------------- */

async function loadUsers(){

if(!usersList) return;

usersList.innerHTML = "";

const snap = await getDocs(collection(db,"users"));

snap.forEach(docu=>{

if(docu.id === currentUser.uid) return;

const user = docu.data();

const avatar =
user.videoPhoto ||
user.photo ||
user.photoURL;

let avatarHTML;

if(avatar && avatar.startsWith("data:video")){

avatarHTML = `
<video class="userAvatar" autoplay loop muted>
<source src="${avatar}" type="video/mp4">
</video>
`;

}else{

avatarHTML = `<img class="userAvatar" src="${avatar}">`;

}

const div = document.createElement("div");
div.className = "userRow";

div.innerHTML = `
${avatarHTML}
<b>${user.name}</b>
`;

div.onclick = ()=> openChat(docu.id,user.name);

usersList.appendChild(div);

});

}


/* ---------------- OPEN CHAT ---------------- */

function openChat(uid,name){

currentFriend = uid;
chatID = [currentUser.uid,uid].sort().join("_");

chatUser.innerText = name;

if(unsubscribeMessages) unsubscribeMessages();

listenMessages();

}


/* ---------------- LISTEN MESSAGES ---------------- */

function listenMessages(){

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

if(m.photo && m.photo.startsWith("data:video")){

avatarHTML = `
<video class="msgAvatar" autoplay loop muted>
<source src="${m.photo}" type="video/mp4">
</video>
`;

}else{

avatarHTML = `<img class="msgAvatar" src="${m.photo}">`;

}

const div = document.createElement("div");

div.className =
"message " + (m.sender===currentUser.uid?"sender":"receiver");

div.innerHTML = `

${avatarHTML}

<div class="msgBubble">

${m.text}

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

${new Date(m.time).toLocaleTimeString()}

</div>

</div>

`;

chatBox.appendChild(div);

});

chatBox.scrollTop = chatBox.scrollHeight;

});

}


/* ---------------- REACTION SYSTEM ---------------- */

function renderReactions(reactions){

if(!reactions) return "";

let counts = {};

Object.values(reactions).forEach(e=>{
counts[e]=(counts[e]||0)+1;
});

let html="";

for(let e in counts){
html+=`${e} ${counts[e]} `;
}

return html;

}

window.react = async (id,emoji)=>{

const ref = doc(db,"chats",chatID,"messages",id);

await updateDoc(ref,{
["reactions."+currentUser.uid]:emoji
});

};


/* ---------------- SEND MESSAGE ---------------- */

async function sendMessage(){

if(!chatID) return;

const text = input.value.trim();
if(!text) return;

const snap = await getDoc(doc(db,"users",currentUser.uid));
const data = snap.data();

const avatar =
data.videoPhoto ||
data.photo ||
currentUser.photoURL;

await addDoc(collection(db,"chats",chatID,"messages"),{

text:text,
sender:currentUser.uid,
photo:avatar,
reactions:{},
time:Date.now()

});

input.value="";

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

if(emojiBtn){

emojiBtn.onclick = ()=>{

emojiPicker.style.display =
emojiPicker.style.display==="block"?"none":"block";

};

}

if(window.EmojiMart){

const picker = new EmojiMart.Picker({

onEmojiSelect:(emoji)=>{
input.value += emoji.native;
}

});

emojiPicker.appendChild(picker);
emojiPicker.style.display="none";

}
