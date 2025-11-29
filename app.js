import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAnW95szTJ1N6gXRdqiBq7zAJqotShRgsE",
    authDomain: "studio-5445731880-d36cd.firebaseapp.com",
    projectId: "studio-5445731880-d36cd",
    storageBucket: "studio-5445731880-d36cd.firebasestorage.app",
    messagingSenderId: "473062732862",
    appId: "1:473062732862:web:f7317817d41a3949200d6f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const authContainer = document.getElementById('authContainer');
const pendingScreen = document.getElementById('pendingScreen');
const userDashboard = document.getElementById('userDashboard');
const adminDashboard = document.getElementById('adminDashboard');
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const tabBtns = document.querySelectorAll('.tab-btn');
const userList = document.getElementById('userList');

// State
let currentUser = null;
let userDoc = null;

// Tab Switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        if (tab === 'login') {
            loginForm.classList.add('active');
            signupForm.classList.remove('active');
        } else {
            loginForm.classList.remove('active');
            signupForm.classList.add('active');
        }
    });
});

// Sign Up
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const errorMsg = document.getElementById('signupError');
    errorMsg.textContent = '';

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create user document in Firestore
        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            role: 'user', // Default role
            status: 'pending', // Default status
            createdAt: new Date().toISOString()
        });

        // Sign out immediately as they are pending
        await signOut(auth);
        alert('Account created! Please wait for admin approval.');

        // Switch to login tab
        tabBtns[0].click();
    } catch (error) {
        errorMsg.textContent = error.message;
    }
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorMsg = document.getElementById('loginError');
    errorMsg.textContent = '';

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle the rest
    } catch (error) {
        errorMsg.textContent = error.message;
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.reload();
});

// Auth State Listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        // Fetch user details from Firestore
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            userDoc = docSnap.data();
            handleUserRouting(userDoc);
        } else {
            // Handle case where user exists in Auth but not Firestore (shouldn't happen normally)
            console.error("No such document!");
            await signOut(auth);
        }
    } else {
        // No user is signed in
        showAuth();
    }
});

function handleUserRouting(userData) {
    hideAll();
    logoutBtn.classList.remove('hidden');

    if (userData.role === 'admin') {
        showAdminDashboard();
    } else {
        if (userData.status === 'approved') {
            showUserDashboard();
        } else {
            showPendingScreen();
            // Optional: Auto logout after showing message? 
            // For now, we keep them logged in but on pending screen, or we can logout.
            // Let's keep them on pending screen but remove navigation.
        }
    }
}

function hideAll() {
    authContainer.classList.add('hidden');
    pendingScreen.classList.add('hidden');
    userDashboard.classList.add('hidden');
    adminDashboard.classList.add('hidden');
}

function showAuth() {
    hideAll();
    authContainer.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
}

function showPendingScreen() {
    pendingScreen.classList.remove('hidden');
}

function showUserDashboard() {
    userDashboard.classList.remove('hidden');
}

async function showAdminDashboard() {
    adminDashboard.classList.remove('hidden');
    loadPendingUsers();
}

// Admin Logic
async function loadPendingUsers() {
    userList.innerHTML = '<p>Loading...</p>';

    const q = query(collection(db, "users"), where("status", "==", "pending"));
    const querySnapshot = await getDocs(q);

    userList.innerHTML = '';

    if (querySnapshot.empty) {
        userList.innerHTML = '<p class="empty-state">No pending approvals.</p>';
        return;
    }

    querySnapshot.forEach((doc) => {
        const user = doc.data();
        const div = document.createElement('div');
        div.className = 'user-item';
        div.innerHTML = `
            <div class="user-info">
                <div class="email">${user.email}</div>
                <div class="date">${new Date(user.createdAt).toLocaleDateString()}</div>
            </div>
            <button class="approve-btn" onclick="approveUser('${doc.id}')">Approve</button>
        `;
        userList.appendChild(div);
    });
}

// Setup Admin (Dev Tool)
const setupAdminBtn = document.getElementById('setupAdminBtn');
setupAdminBtn.addEventListener('click', async () => {
    const email = prompt("Enter email for Admin:", "admin@test.com");
    if (!email) return;
    const password = prompt("Enter password for Admin:", "admin123");
    if (!password) return;

    try {
        // Try to create user
        let user;
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            user = userCredential.user;
        } catch (e) {
            if (e.code === 'auth/email-already-in-use') {
                // If exists, try to login
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                user = userCredential.user;
            } else {
                throw e;
            }
        }

        // Force update to admin
        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            role: 'admin',
            status: 'approved',
            createdAt: new Date().toISOString()
        });

        alert(`Success! User ${email} is now an Admin. Collection 'users' created.`);
        window.location.reload();

    } catch (error) {
        console.error(error);
        alert('Error setting up admin: ' + error.message);
    }
});

// Make approveUser global so it can be called from HTML
window.approveUser = async (uid) => {
    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            status: "approved"
        });
        alert('User approved!');
        loadPendingUsers(); // Refresh list
    } catch (error) {
        console.error("Error updating document: ", error);
        alert('Error approving user');
    }
};
