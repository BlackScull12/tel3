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
storageBucket: "chatgithub-e838d.firebasestorage.app",
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


let currentUser=null;
let currentFriend=null;
let chatID=null;


/* LOGIN */

if(googleBtn){

googleBtn.onclick=async()=>{

const res=await signInWithPopup(auth,provider);
const user=res.user;

await setDoc(doc(db,"users",user.uid),{

name:user.displayName,
email:user.email,
online:true,
lastSeen:Date.now()

},{merge:true});

window.location="chat.html";

};

}


/* AUTH STATE */

onAuthStateChanged(auth,async(user)=>{

if(!user) return;

currentUser=user;

/* SET ONLINE */

await updateDoc(doc(db,"users",user.uid),{
online:true
});

/* LAST SEEN */

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
<span id="unread-${docu.id}" style="color:red;margin-left:10px"></span>
`;

div.onclick=()=>handleUserClick(docu.id,user.name);

usersList.appendChild(div);

/* LISTEN UNREAD */

listenUnread(docu.id);

});

}


/* UNREAD MESSAGE COUNTER */

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

if(badge){

badge.innerText=count>0?"("+count+")":"";

}

});

}


/* FRIEND CLICK */

async function handleUserClick(uid,name){

const q=query(
collection(db,"friendRequests"),
where("status","==","accepted")
);

const snap=await getDocs(q);

let isFriend=false;

snap.forEach(d=>{

const r=d.data();

if(
(r.from===currentUser.uid && r.to===uid) ||
(r.from===uid && r.to===currentUser.uid)
){
isFriend=true;
}

});

if(isFriend){

openChat(uid,name);

}else{

sendFriendRequest(uid);

}

}


/* SEND FRIEND REQUEST */

async function sendFriendRequest(uid){

const q=query(
collection(db,"friendRequests"),
where("from","==",currentUser.uid),
where("to","==",uid)
);

const snap=await getDocs(q);

if(!snap.empty){

alert("Request already sent");
return;

}

await addDoc(collection(db,"friendRequests"),{

from:currentUser.uid,
to:uid,
status:"pending"

});

alert("Friend request sent");

}


/* OPEN CHAT */

function openChat(uid,name){

currentFriend=uid;
chatID=[currentUser.uid,uid].sort().join("_");

chatUser.innerText=name;

listenMessages();
listenFriendStatus();

}


/* FRIEND STATUS */

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


/* LISTEN MESSAGES */

function listenMessages(){

const q=query(
collection(db,"chats",chatID,"messages"),
orderBy("time")
);

onSnapshot(q,(snap)=>{

chatBox.innerHTML="";

snap.forEach(async(d)=>{

const m=d.data();

const div=document.createElement("div");

div.className=m.sender===currentUser.uid?"sender":"receiver";

let status="";

if(m.sender===currentUser.uid){

status=m.read?"✓✓ Read":m.delivered?"✓✓ Delivered":"✓ Sent";

}

div.innerHTML=`
${m.text}
<div style="font-size:10px;color:gray">
${new Date(m.time).toLocaleTimeString()} ${status}
</div>
`;

chatBox.appendChild(div);

/* MARK READ */

if(m.sender!==currentUser.uid && !m.read){

await updateDoc(d.ref,{
read:true
});

}

});

chatBox.scrollTop=chatBox.scrollHeight;

});

}


/* SEND MESSAGE FUNCTION */

async function sendMessage(){

if(!input.value.trim()) return;

await addDoc(collection(db,"chats",chatID,"messages"),{

text:input.value,
sender:currentUser.uid,
time:Date.now(),
delivered:true,
read:false

});

input.value="";

}


/* SEND BUTTON */

if(sendBtn){

sendBtn.onclick=sendMessage;

}


/* ENTER KEY SEND */

if(input){

input.addEventListener("keypress",(e)=>{

if(e.key==="Enter"){

e.preventDefault();
sendMessage();

}

});

}
```
