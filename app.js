
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
getAuth,
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
getFirestore,
collection,
doc,
getDocs,
addDoc,
onSnapshot,
updateDoc,
orderBy,
query
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig={
apiKey:"APIKEY",
authDomain:"PROJECT.firebaseapp.com",
projectId:"PROJECT",
};

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);

const usersList=document.getElementById("usersList");
const chatBox=document.getElementById("chatBox");
const input=document.getElementById("messageInput");
const sendBtn=document.getElementById("sendBtn");
const chatUser=document.getElementById("chatUser");

let currentUser=null;
let currentFriend=null;
let chatID=null;


/* AUTH */

onAuthStateChanged(auth,user=>{

if(!user)return;

currentUser=user;
loadUsers();

});


/* LOAD USERS */

async function loadUsers(){

usersList.innerHTML="";

const snap=await getDocs(collection(db,"users"));

snap.forEach(docu=>{

if(docu.id===currentUser.uid)return;

const user=docu.data();

const div=document.createElement("div");
div.className="userRow";
div.innerText=user.name;

div.onclick=()=>openChat(docu.id,user.name);

usersList.appendChild(div);

});

}


/* OPEN CHAT */

function openChat(uid,name){

currentFriend=uid;
chatID=[currentUser.uid,uid].sort().join("_");

chatUser.innerText=name;

listenMessages();

}


/* LISTEN MESSAGES */

function listenMessages(){

const q=query(
collection(db,"chats",chatID,"messages"),
orderBy("time")
);

onSnapshot(q,snap=>{

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

<div class="reactions" id="react-${d.id}">
${renderReactions(m.reactions)}
</div>

`;

chatBox.appendChild(div);

});

chatBox.scrollTop=chatBox.scrollHeight;

});

}


/* RENDER REACTIONS */

function renderReactions(reactions){

if(!reactions)return "";

let result={};

Object.values(reactions).forEach(e=>{

if(!result[e])result[e]=0;
result[e]++;

});

let html="";

for(let e in result){

html+=`${e} ${result[e]} `;

}

return html;

}


/* REACT FUNCTION */

window.react=async function(messageId,emoji){

const ref=doc(db,"chats",chatID,"messages",messageId);

await updateDoc(ref,{
["reactions."+currentUser.uid]:emoji
});

}


/* SEND MESSAGE */

async function sendMessage(){

if(!input.value.trim())return;

await addDoc(collection(db,"chats",chatID,"messages"),{

text:input.value,
sender:currentUser.uid,
time:Date.now()

});

input.value="";

}

sendBtn.onclick=sendMessage;

input.addEventListener("keypress",e=>{
if(e.key==="Enter")sendMessage();
});
