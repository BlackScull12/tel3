
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
where,
onSnapshot,
updateDoc,
orderBy
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";


/* FIREBASE */

const firebaseConfig = {
apiKey: "AIzaSyAxt94UyMn8AP8PFaSHPJ29JnZQ2KI3kZw",
authDomain: "chatgithub-e838d.firebaseapp.com",
projectId: "chatgithub-e838d",
storageBucket: "chatgithub-e838d.appspot.com",
messagingSenderId: "755589384017",
appId: "1:755589384017:web:6af4c6d223d646cf36f570"
};

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
const emojiPickerDiv = document.getElementById("emojiPicker");

const gifBtn = document.getElementById("gifBtn");
const gifPickerDiv = document.getElementById("gifPicker");


/* GLOBAL */

let currentUser = null;
let currentFriend = null;
let chatID = null;
let unsubscribeMessages = null;

let emojiOpen = false;
let gifOpen = false;


/* GOOGLE LOGIN */

if (googleBtn) {

googleBtn.onclick = async () => {

const result = await signInWithPopup(auth, provider);
const user = result.user;

await setDoc(doc(db,"users",user.uid),{
name:user.displayName,
email:user.email,
online:true,
lastSeen:Date.now()
},{merge:true});

window.location.href="chat.html";

};

}


/* AUTH STATE */

onAuthStateChanged(auth, async (user)=>{

if(!user) return;

currentUser=user;

await setDoc(doc(db,"users",user.uid),{
online:true
},{merge:true});

window.addEventListener("beforeunload",()=>{

updateDoc(doc(db,"users",user.uid),{
online:false,
lastSeen:Date.now()
});

});

if(usersList) loadUsers();

});


/* LOAD USERS */

async function loadUsers(){

usersList.innerHTML="";

const snap=await getDocs(collection(db,"users"));

snap.forEach(docu=>{

if(docu.id===currentUser.uid) return;

const user=docu.data();

const div=document.createElement("div");

div.className="userRow";

div.innerHTML=`
${user.name}
<span style="font-size:12px;color:gray">
${user.online?"🟢 Online":"Last seen "+new Date(user.lastSeen).toLocaleTimeString()}
</span>
<span id="unread-${docu.id}" style="color:red;margin-left:8px"></span>
`;

div.onclick=()=>openChat(docu.id,user.name);

usersList.appendChild(div);

listenUnread(docu.id);

});

}


/* UNREAD COUNTER */

function listenUnread(uid){

const id=[currentUser.uid,uid].sort().join("_");

const q=query(
collection(db,"chats",id,"messages"),
where("read","==",false)
);

onSnapshot(q,(snap)=>{

let count=0;

snap.forEach(d=>{

const m=d.data();
if(m.sender===uid) count++;

});

const badge=document.getElementById("unread-"+uid);

if(badge) badge.innerText=count>0?"("+count+")":"";

});

}


/* OPEN CHAT */

function openChat(uid,name){

currentFriend=uid;
chatID=[currentUser.uid,uid].sort().join("_");

if(chatUser) chatUser.innerText=name;

listenFriendStatus();
listenMessages();

}


/* STATUS */

function listenFriendStatus(){

const ref=doc(db,"users",currentFriend);

onSnapshot(ref,(docu)=>{

const data=docu.data();

const status=data.online?
"🟢 Online":
"Last seen "+new Date(data.lastSeen).toLocaleTimeString();

chatUser.innerText=data.name+" ("+status+")";

});

}


/* MESSAGES */

function listenMessages(){

if(!chatBox) return;

if(unsubscribeMessages) unsubscribeMessages();

const q=query(
collection(db,"chats",chatID,"messages"),
orderBy("time")
);

unsubscribeMessages=onSnapshot(q,(snap)=>{

chatBox.innerHTML="";

snap.forEach(async(d)=>{

const m=d.data();

const div=document.createElement("div");

div.className=m.sender===currentUser.uid?"sender":"receiver";

let content=m.text;

if(m.gif){
content=`<img src="${m.gif}" style="max-width:200px;border-radius:10px">`;
}

div.innerHTML=`
${content}
<div style="font-size:10px;color:gray">
${new Date(m.time).toLocaleTimeString()}
</div>
`;

chatBox.appendChild(div);

if(m.sender!==currentUser.uid && !m.read){
updateDoc(d.ref,{read:true});
}

});

chatBox.scrollTop=chatBox.scrollHeight;

});

}


/* SEND MESSAGE */

async function sendMessage(){

if(!input || !currentFriend) return;
if(!input.value.trim()) return;

await addDoc(collection(db,"chats",chatID,"messages"),{

text:input.value,
sender:currentUser.uid,
time:Date.now(),
read:false

});

input.value="";

}


/* SEND GIF */

async function sendGif(url){

await addDoc(collection(db,"chats",chatID,"messages"),{

gif:url,
sender:currentUser.uid,
time:Date.now(),
read:false

});

gifPickerDiv.innerHTML="";
gifOpen=false;

}


/* SEND BUTTON */

if(sendBtn) sendBtn.onclick=sendMessage;

if(input){

input.addEventListener("keydown",(e)=>{

if(e.key==="Enter"){

e.preventDefault();
sendMessage();

}

});

}


/* EMOJI PICKER TOGGLE */

if(emojiBtn){

emojiBtn.onclick=()=>{

if(emojiOpen){

emojiPickerDiv.innerHTML="";
emojiOpen=false;
return;

}

gifPickerDiv.innerHTML="";
gifOpen=false;

emojiPickerDiv.innerHTML="";

const picker=new EmojiMart.Picker({
onEmojiSelect:(emoji)=>{
input.value+=emoji.native;
}
});

emojiPickerDiv.appendChild(picker);

emojiOpen=true;

};

}


/* GIF PICKER TOGGLE */

if(gifBtn){

gifBtn.onclick=async()=>{

if(gifOpen){

gifPickerDiv.innerHTML="";
gifOpen=false;
return;

}

emojiPickerDiv.innerHTML="";
emojiOpen=false;

gifPickerDiv.innerHTML="Loading GIFs...";

const res=await fetch("https://g.tenor.com/v1/trending?key=LIVDSRZULELA&limit=20");
const data=await res.json();

gifPickerDiv.innerHTML="";

data.results.forEach(g=>{

const img=document.createElement("img");

img.src=g.media[0].gif.url;

img.style.width="100px";
img.style.margin="5px";
img.style.cursor="pointer";

img.onclick=()=>sendGif(g.media[0].gif.url);

gifPickerDiv.appendChild(img);

});

gifOpen=true;

};

}
