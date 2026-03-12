
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDocs, addDoc, query, where, onSnapshot, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export const firebaseConfig = {
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

const googleBtn=document.getElementById("googleLogin");
const usersList=document.getElementById("usersList");
const bell=document.getElementById("bell");
const reqCount=document.getElementById("reqCount");
const requestsPanel=document.getElementById("requestsPanel");

const chatBox=document.getElementById("chatBox");
const input=document.getElementById("messageInput");
const sendBtn=document.getElementById("sendBtn");

let currentUser=null;
let currentFriend=null;
let chatID=null;

if(googleBtn){
googleBtn.onclick=async()=>{
const res=await signInWithPopup(auth,provider);
const user=res.user;

await setDoc(doc(db,"users",user.uid),{
name:user.displayName,
email:user.email
},{merge:true});

location="chat.html";
};
}

onAuthStateChanged(auth,async(user)=>{

if(!user) return;

currentUser=user;

if(usersList) loadUsers();
listenRequests();

});

async function loadUsers(){

usersList.innerHTML="";

const snap=await getDocs(collection(db,"users"));

snap.forEach(docu=>{

if(docu.id===currentUser.uid) return;

const user=docu.data();

const div=document.createElement("div");
div.className="userRow";
div.innerText=user.name;

div.onclick=()=>sendFriendRequest(docu.id);

usersList.appendChild(div);

});

}

async function sendFriendRequest(uid){

await addDoc(collection(db,"friendRequests"),{
from:currentUser.uid,
to:uid,
status:"pending"
});

alert("Friend request sent");

}

function listenRequests(){

const q=query(
collection(db,"friendRequests"),
where("to","==",currentUser.uid),
where("status","==","pending")
);

onSnapshot(q,(snap)=>{

if(reqCount) reqCount.innerText=snap.size||"";

if(!requestsPanel) return;

requestsPanel.innerHTML="";

snap.forEach(docu=>{

const data=docu.data();

const div=document.createElement("div");

div.innerHTML=`Request from ${data.from}
<button data-id="${docu.id}" class="accept">✔</button>
<button data-id="${docu.id}" class="decline">✖</button>`;

requestsPanel.appendChild(div);

});

});

}

if(bell){
bell.onclick=()=>{
requestsPanel.style.display =
requestsPanel.style.display==="block"?"none":"block";
};
}

document.addEventListener("click",async(e)=>{

if(e.target.className==="accept"){

const id=e.target.dataset.id;

await updateDoc(doc(db,"friendRequests",id),{
status:"accepted"
});

alert("Friend added");

}

if(e.target.className==="decline"){

const id=e.target.dataset.id;

await updateDoc(doc(db,"friendRequests",id),{
status:"declined"
});

}

});

async function openChat(uid){

const q=query(
collection(db,"friendRequests"),
where("status","==","accepted")
);

const snap=await getDocs(q);

let allowed=false;

snap.forEach(d=>{
const r=d.data();
if(
(r.from===currentUser.uid && r.to===uid) ||
(r.from===uid && r.to===currentUser.uid)
){
allowed=true;
}
});

if(!allowed){
alert("You can only chat after friend request accepted");
return;
}

currentFriend=uid;
chatID=[currentUser.uid,uid].sort().join("_");

listenMessages();

}

function listenMessages(){

const q=query(
collection(db,"chats",chatID,"messages"),
orderBy("time")
);

onSnapshot(q,(snap)=>{

chatBox.innerHTML="";

snap.forEach(d=>{

const m=d.data();

const div=document.createElement("div");

div.className=m.sender===currentUser.uid?"sender":"receiver";

div.innerText=m.text;

chatBox.appendChild(div);

});

});

}

if(sendBtn){

sendBtn.onclick=async()=>{

if(!currentFriend) return;

await addDoc(collection(db,"chats",chatID,"messages"),{
text:input.value,
sender:currentUser.uid,
time:Date.now()
});

input.value="";

};

}
