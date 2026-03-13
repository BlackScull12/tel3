
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
getDoc,
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

let emojiOpen = false;
let gifOpen = false;

let unsubscribeMessages = null;


/* GOOGLE LOGIN */

if (googleBtn) {

googleBtn.onclick = async () => {

const res = await signInWithPopup(auth, provider);
const user = res.user;

await setDoc(doc(db, "users", user.uid), {
name: user.displayName,
email: user.email,
online: true,
lastSeen: Date.now()
}, { merge: true });

window.location = "chat.html";

};

}


/* AUTH STATE */

onAuthStateChanged(auth, async (user) => {

if (!user) return;

currentUser = user;

await setDoc(doc(db, "users", user.uid), {
online: true
}, { merge: true });

window.addEventListener("beforeunload", () => {

setDoc(doc(db, "users", user.uid), {
online: false,
lastSeen: Date.now()
}, { merge: true });

});

loadUsers();

});


/* LOAD USERS */

async function loadUsers() {

if (!usersList) return;

usersList.innerHTML = "";

const snap = await getDocs(collection(db, "users"));

snap.forEach(docu => {

if (docu.id === currentUser.uid) return;

const user = docu.data();

const div = document.createElement("div");
div.className = "userRow";

div.innerHTML = `
${user.name}
<span style="font-size:12px;color:gray">
${user.online ? "🟢 Online" : "Last seen " + new Date(user.lastSeen).toLocaleTimeString()}
</span>
<span id="unread-${docu.id}" style="color:red;margin-left:8px"></span>
`;

div.onclick = () => openChat(docu.id, user.name);

usersList.appendChild(div);

listenUnread(docu.id);

});

}


/* UNREAD COUNTER */

function listenUnread(uid) {

const id = [currentUser.uid, uid].sort().join("_");

const q = query(
collection(db, "chats", id, "messages"),
where("read", "==", false)
);

onSnapshot(q, (snap) => {

let count = 0;

snap.forEach(d => {
const m = d.data();
if (m.sender === uid) count++;
});

const badge = document.getElementById("unread-" + uid);
if (badge) badge.innerText = count > 0 ? "(" + count + ")" : "";

});

}


/* OPEN CHAT */

function openChat(uid, name) {

currentFriend = uid;
chatID = [currentUser.uid, uid].sort().join("_");

if (chatUser) chatUser.innerText = name;

listenMessages();
listenFriendStatus();

}


/* FRIEND STATUS */

function listenFriendStatus() {

const ref = doc(db, "users", currentFriend);

onSnapshot(ref, (docu) => {

const data = docu.data();

const status = data.online ?
"🟢 Online" :
"Last seen " + new Date(data.lastSeen).toLocaleTimeString();

chatUser.innerText = data.name + " (" + status + ")";

});

}


/* LISTEN MESSAGES */

function listenMessages() {

if (unsubscribeMessages) unsubscribeMessages();

const q = query(
collection(db, "chats", chatID, "messages"),
orderBy("time")
);

unsubscribeMessages = onSnapshot(q, (snap) => {

chatBox.innerHTML = "";

snap.forEach(async (d) => {

const m = d.data();

const div = document.createElement("div");
div.className = m.sender === currentUser.uid ? "sender" : "receiver";


/* CONTENT */

let content = m.text || "";

if (m.gif) {
content = `<img src="${m.gif}" style="max-width:200px;border-radius:10px">`;
}


/* REACTIONS */

let reactionsHTML = "";

if (m.reactions) {

Object.keys(m.reactions).forEach(r => {
reactionsHTML += `<span style="margin-right:6px">${r} ${m.reactions[r]}</span>`;
});

}


div.innerHTML = `
<div>${content}</div>

<div style="font-size:10px;color:gray">
${new Date(m.time).toLocaleTimeString()}
</div>

<div style="margin-top:5px">${reactionsHTML}</div>
`;

div.onclick = () => openReactionMenu(d.id);

chatBox.appendChild(div);


/* MARK READ */

if (m.sender !== currentUser.uid && !m.read) {
updateDoc(d.ref, { read: true });
}

});

chatBox.scrollTop = chatBox.scrollHeight;

});

}


/* REACTION MENU */

function openReactionMenu(messageID) {

const reaction = prompt("React with: 👍 ❤️ 😂 🔥");

if (!reaction) return;

addReaction(messageID, reaction);

}


/* ADD REACTION */

async function addReaction(messageID, reaction) {

const ref = doc(db, "chats", chatID, "messages", messageID);
const snap = await getDoc(ref);

if (!snap.exists()) return;

const data = snap.data();
const reactions = data.reactions || {};

reactions[reaction] = (reactions[reaction] || 0) + 1;

await updateDoc(ref, { reactions });

}


/* SEND MESSAGE */

async function sendMessage() {

if (!currentFriend) return;
if (!input.value.trim()) return;

await addDoc(collection(db, "chats", chatID, "messages"), {

text: input.value,
sender: currentUser.uid,
time: Date.now(),
read: false

});

input.value = "";

}


/* SEND GIF */

async function sendGif(url) {

await addDoc(collection(db, "chats", chatID, "messages"), {

gif: url,
sender: currentUser.uid,
time: Date.now(),
read: false

});

gifPickerDiv.innerHTML = "";
gifOpen = false;

}


/* SEND BUTTON */

if (sendBtn) sendBtn.onclick = sendMessage;


/* ENTER SEND */

if (input) {

input.addEventListener("keydown", (e) => {

if (e.key === "Enter") {
e.preventDefault();
sendMessage();
}

});

}


/* EMOJI PICKER */

if (emojiBtn) {

emojiBtn.onclick = () => {

if (emojiOpen) {

emojiPickerDiv.innerHTML = "";
emojiOpen = false;
return;

}

gifPickerDiv.innerHTML = "";
gifOpen = false;

if (typeof EmojiMart === "undefined") {
alert("Emoji library not loaded");
return;
}

const picker = new EmojiMart.Picker({
onEmojiSelect: (emoji) => {
input.value += emoji.native;
}
});

emojiPickerDiv.appendChild(picker);
emojiOpen = true;

};

}


/* GIF PICKER */

if (gifBtn) {

gifBtn.onclick = async () => {

if (gifOpen) {

gifPickerDiv.innerHTML = "";
gifOpen = false;
return;

}

emojiPickerDiv.innerHTML = "";
emojiOpen = false;

gifPickerDiv.innerHTML = "Loading GIFs...";

const res = await fetch("https://g.tenor.com/v1/trending?key=LIVDSRZULELA&limit=20");
const data = await res.json();

gifPickerDiv.innerHTML = "";

data.results.forEach(g => {

const img = document.createElement("img");

img.src = g.media[0].gif.url;
img.style.width = "100px";
img.style.margin = "5px";
img.style.cursor = "pointer";

img.onclick = () => sendGif(g.media[0].gif.url);

gifPickerDiv.appendChild(img);

});

gifOpen = true;

};

}
