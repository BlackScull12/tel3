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


/* GIF API */

const KLIPY_API_KEY="GMuQzaqlWpM7rtGovFj5OIlNZQfyiAwVJFBXDvavpCjMbbmgkryWv5V3XQx53HxI";


/* INIT */

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);
const provider=new GoogleAuthProvider();


/* DOM */

const googleBtn=document.getElementById("googleLogin");

const usersList=document.getElementById("usersList");

const chatBox=document.getElementById("chatBox");
const input=document.getElementById("messageInput");
const sendBtn=document.getElementById("sendBtn");
const chatUser=document.getElementById("chatUser");

const emojiBtn=document.getElementById("emojiBtn");
const gifBtn=document.getElementById("gifBtn");

const emojiPicker=document.getElementById("emojiPicker");
const gifPicker=document.getElementById("gifPicker");

const nicknameBtn=document.getElementById("nicknameBtn");

const profileUpload=document.getElementById("profileUpload");
const uploadBtn=document.getElementById("uploadBtn");
const myProfilePic=document.getElementById("myProfilePic");


/* STATE */

let currentUser=null;
let currentFriend=null;
let chatID=null;
let unsubscribeMessages=null;


/* LOGIN */

if(googleBtn){

googleBtn.onclick=async()=>{

const res=await signInWithPopup(auth,provider);
const user=res.user;

await setDoc(doc(db,"users",user.uid),{

name:user.displayName,
email:user.email,
photo:user.photoURL || "",
animatedPhoto:"",
online:true,
lastSeen:Date.now()

},{merge:true});

window.location="chat.html";

};

}


/* AUTH */

onAuthStateChanged(auth,async(user)=>{

if(!user) return;

currentUser=user;

/* load profile */

const snap=await getDoc(doc(db,"users",user.uid));

if(snap.exists()){

const data=snap.data();

if(myProfilePic){
myProfilePic.src=data.animatedPhoto || data.photo || user.photoURL;
}

}

await setDoc(doc(db,"users",user.uid),{
online:true
},{merge:true});

window.addEventListener("beforeunload",async()=>{

await setDoc(doc(db,"users",user.uid),{
online:false,
lastSeen:Date.now()
},{merge:true});

});

loadUsers();

});


/* PROFILE UPLOAD */

if(uploadBtn && profileUpload){

uploadBtn.onclick=()=>profileUpload.click();

profileUpload.onchange=()=>{

const file=profileUpload.files[0];
if(!file) return;

const reader=new FileReader();

reader.onload=async(e)=>{

const base64=e.target.result;

if(file.type==="image/gif"){

await updateDoc(doc(db,"users",currentUser.uid),{
animatedPhoto:base64,
photo:""
});

}else{

await updateDoc(doc(db,"users",currentUser.uid),{
photo:base64,
animatedPhoto:""
});

}

if(myProfilePic) myProfilePic.src=base64;

loadUsers();

};

reader.readAsDataURL(file);

};

}


/* LOAD USERS */

async function loadUsers(){

if(!usersList) return;

usersList.innerHTML="";

const snap=await getDocs(collection(db,"users"));

snap.forEach(docu=>{

if(docu.id===currentUser.uid) return;

const user=docu.data();

const avatar=user.animatedPhoto || user.photo || user.photoURL || "";

const div=document.createElement("div");
div.className="userRow";

div.innerHTML=`

<img src="${avatar}">

<div class="userInfo">

<b>${user.name}</b>

<span style="font-size:12px;color:gray">
${user.online?"🟢 Online":"Last seen "+new Date(user.lastSeen||Date.now()).toLocaleTimeString()}
</span>

</div>

`;

div.onclick=()=>openChat(docu.id,user.name);

usersList.appendChild(div);

});

}


/* OPEN CHAT */

async function openChat(uid,name){

currentFriend=uid;
chatID=[currentUser.uid,uid].sort().join("_");

loadNickname(name);

if(unsubscribeMessages) unsubscribeMessages();

listenMessages();

}


/* NICKNAME */

async function loadNickname(defaultName){

if(!chatUser) return;

const ref=doc(db,"chats",chatID);
const snap=await getDoc(ref);

if(snap.exists()){

const data=snap.data();

if(data.nicknames && data.nicknames[currentFriend]){
chatUser.innerText=data.nicknames[currentFriend];
return;
}

}

chatUser.innerText=defaultName;

}


if(nicknameBtn){

nicknameBtn.onclick=async()=>{

if(!chatID) return;

const name=prompt("Enter nickname:");
if(!name) return;

await setDoc(doc(db,"chats",chatID),{
nicknames:{[currentFriend]:name}
},{merge:true});

chatUser.innerText=name;

};

}


/* LISTEN MESSAGES */

function listenMessages(){

if(!chatBox) return;

const q=query(
collection(db,"chats",chatID,"messages"),
orderBy("time")
);

unsubscribeMessages=onSnapshot(q,async(snap)=>{

chatBox.innerHTML="";

for(const d of snap.docs){

const m=d.data();

const userSnap=await getDoc(doc(db,"users",m.sender));
let avatar="";

if(userSnap.exists()){

const u=userSnap.data();
avatar=u.animatedPhoto || u.photo || "";

}

const div=document.createElement("div");

div.className="message "+(m.sender===currentUser.uid?"sender":"receiver");

div.innerHTML=`

<img class="msgAvatar" src="${avatar}">

<div class="msgBubble">

${m.text}

<div class="reactionBar">
<span onclick="react('${d.id}','👍')">👍</span>
<span onclick="react('${d.id}','❤️')">❤️</span>
<span onclick="react('${d.id}','😂')">😂</span>
<span onclick="react('${d.id}','😮')">😮</span>
<span onclick="react('${d.id}','😢')">😢</span>
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

}

chatBox.scrollTop=chatBox.scrollHeight;

});

}


/* REACTIONS */

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


window.react=async function(messageId,emoji){

const ref=doc(db,"chats",chatID,"messages",messageId);

await updateDoc(ref,{
["reactions."+currentUser.uid]:emoji
});

};


/* SEND MESSAGE */

async function sendMessage(){

if(!chatID) return;

const text=input.value.trim();
if(!text) return;

await addDoc(collection(db,"chats",chatID,"messages"),{

text:text,
sender:currentUser.uid,
time:Date.now()

});

input.value="";

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


/* EMOJI PICKER */

if(emojiPicker && window.EmojiMart){

const picker=new EmojiMart.Picker({
onEmojiSelect:(emoji)=>{
input.value+=emoji.native;
}
});

emojiPicker.appendChild(picker);
emojiPicker.style.display="none";

}


if(emojiBtn){

emojiBtn.onclick=()=>{

emojiPicker.style.display=
emojiPicker.style.display==="block"?"none":"block";

if(gifPicker) gifPicker.style.display="none";

};

}


/* GIF SEARCH */

if(gifPicker){

gifPicker.innerHTML=`

<input id="gifSearch" placeholder="Search GIFs..." style="width:100%;padding:8px;border:none;border-bottom:1px solid #ccc">

<div id="gifResults" style="display:flex;flex-wrap:wrap;gap:5px;padding:5px"></div>

`;

gifPicker.style.display="none";

const gifSearch=document.getElementById("gifSearch");
const gifResults=document.getElementById("gifResults");

gifSearch.addEventListener("input",async()=>{

const queryText=gifSearch.value.trim();
if(!queryText) return;

const res=await fetch(`https://api.klipy.com/gifs/search?q=${queryText}&apikey=${KLIPY_API_KEY}&limit=20`);

const data=await res.json();

gifResults.innerHTML="";

data.data.forEach(gif=>{

const url=gif.images.original.url;

const img=document.createElement("img");

img.src=url;
img.style.width="100px";
img.style.cursor="pointer";

img.onclick=async()=>{

await addDoc(collection(db,"chats",chatID,"messages"),{

text:`<img src="${url}" style="max-width:200px;border-radius:10px">`,
sender:currentUser.uid,
time:Date.now()

});

gifPicker.style.display="none";

};

gifResults.appendChild(img);

});

});

}


if(gifBtn){

gifBtn.onclick=()=>{

gifPicker.style.display=
gifPicker.style.display==="block"?"none":"block";

if(emojiPicker) emojiPicker.style.display="none";

};

}


/* CLOSE PICKERS */

document.addEventListener("click",(e)=>{

if(emojiPicker && emojiBtn){

if(!emojiPicker.contains(e.target) && e.target!==emojiBtn){
emojiPicker.style.display="none";
}

}

if(gifPicker && gifBtn){

if(!gifPicker.contains(e.target) && e.target!==gifBtn){
gifPicker.style.display="none";
}

}

});
