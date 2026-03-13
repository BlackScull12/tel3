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
animatedPhoto:""

},{merge:true});

window.location = "chat.html";

};

}


/* ---------------- AUTH STATE ---------------- */

onAuthStateChanged(auth, async (user)=>{

if(!user) return;

currentUser = user;

const snap = await getDoc(doc(db,"users",user.uid));

if(snap.exists()){

const data = snap.data();

const avatar =
data.animatedPhoto ||
data.photo ||
user.photoURL ||
"https://i.imgur.com/HeIi0wU.png";

if(myProfilePic){
myProfilePic.src = avatar;
}

}

loadUsers();

});


/* ---------------- PROFILE UPLOAD (GIF FIXED) ---------------- */

if(uploadBtn && profileUpload){

uploadBtn.onclick = ()=> profileUpload.click();

profileUpload.onchange = ()=>{

const file = profileUpload.files[0];
if(!file) return;

const reader = new FileReader();

/* IMPORTANT: read full base64 so GIF animation remains */

reader.onload = async (e)=>{

const base64 = e.target.result;

const userRef = doc(db,"users",currentUser.uid);

if(file.type === "image/gif"){

await updateDoc(userRef,{
animatedPhoto: base64,
photo:""
});

}else{

await updateDoc(userRef,{
photo: base64,
animatedPhoto:""
});

}

/* update UI instantly */

if(myProfilePic){
myProfilePic.src = base64;
}

/* reload users */

loadUsers();

};

reader.readAsDataURL(file);

};

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
user.animatedPhoto ||
user.photo ||
user.photoURL ||
"https://i.imgur.com/HeIi0wU.png";

const div = document.createElement("div");
div.className = "userRow";

div.innerHTML = `

<img src="${avatar}" class="userAvatar">

<div>

<b>${user.name}</b>

</div>

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

if(unsubscribeMessages){
unsubscribeMessages();
}

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

const avatar = m.photo || "";

const div = document.createElement("div");

div.className = "message " +
(m.sender === currentUser.uid ? "sender":"receiver");

div.innerHTML = `

<img class="msgAvatar" src="${avatar}">

<div class="msgBubble">

${m.text}

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


/* ---------------- SEND MESSAGE ---------------- */

async function sendMessage(){

if(!chatID) return;

const text = input.value.trim();
if(!text) return;

const userSnap = await getDoc(doc(db,"users",currentUser.uid));
const userData = userSnap.data();

const avatar =
userData.animatedPhoto ||
userData.photo ||
currentUser.photoURL ||
"https://i.imgur.com/HeIi0wU.png";

await addDoc(collection(db,"chats",chatID,"messages"),{

text:text,
sender:currentUser.uid,
photo:avatar,
time:Date.now()

});

input.value = "";

}


if(sendBtn){
sendBtn.onclick = sendMessage;
}


if(input){

input.addEventListener("keydown",(e)=>{

if(e.key === "Enter"){
e.preventDefault();
sendMessage();
}

});

}
