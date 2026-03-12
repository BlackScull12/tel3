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
let messageListener=null;


/* LOGIN */

if(googleBtn){

googleBtn.onclick = async ()=>{

try{

const res = await signInWithPopup(auth,provider);
const user = res.user;

await setDoc(doc(db,"users",user.uid),{

name:user.displayName,
email:user.email,
online:true,
lastSeen:Date.now()

},{merge:true});

window.location="chat.html";

}catch(err){

console.error(err);
alert("Login failed");

}

};

}


/* AUTH STATE */

onAuthStateChanged(auth,async(user)=>{

if(!user) return;

currentUser=user;

/* SET USER ONLINE */

await setDoc(doc(db,"users",user.uid),{
online:true
},{merge:true});

/* UPDATE LAST SEEN */

window.addEventListener("beforeunload",()=>{

updateDoc(doc(db,"users",user.uid),{
online:false,
lastSeen:Date
```
