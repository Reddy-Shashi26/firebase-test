import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
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
const phoneForm = document.getElementById('phoneForm');
const tabBtns = document.querySelectorAll('.tab-btn');
const userList = document.getElementById('userList');

// Admin & Profile Elements
const setupAdminBtn = document.getElementById('setupAdminBtn');
const newFieldNameInput = document.getElementById('newFieldName');
const addFieldBtn = document.getElementById('addFieldBtn');
const fieldsList = document.getElementById('fieldsList');
const allUsersTable = document.getElementById('allUsersTable');
const userTableHead = document.getElementById('userTableHead');
const userTableBody = document.getElementById('userTableBody');
const editProfileBtn = document.getElementById('editProfileBtn');
const profileSection = document.getElementById('profileSection');
const profileForm = document.getElementById('profileForm');
const dynamicProfileFields = document.getElementById('dynamicProfileFields');

// Phone Auth Elements
const sendOtpBtn = document.getElementById('sendOtpBtn');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const otpContainer = document.getElementById('otpContainer');
const phoneNumberInput = document.getElementById('phoneNumber');
const otpInput = document.getElementById('otpInput');
const phoneError = document.getElementById('phoneError');

// State
let currentUser = null;
let userDoc = null;
let confirmationResult = null;
let dynamicFields = [];

// Phone Auth Logic
function initRecaptcha() {
    if (window.recaptchaVerifier) {
        try {
            window.recaptchaVerifier.clear();
        } catch (e) {
            console.warn("Could not clear recaptcha", e);
        }
    }

    try {
        console.log("Initializing Recaptcha...");
        const container = document.getElementById('recaptcha-container');
        window.recaptchaVerifier = new RecaptchaVerifier(container, {
            'size': 'normal',
            'callback': (response) => {
                console.log("Recaptcha solved");
            },
            'expired-callback': () => {
                console.log("Recaptcha expired");
            }
        });
        window.recaptchaVerifier.render().then((widgetId) => {
            console.log("Recaptcha rendered, widgetId:", widgetId);
        });
    } catch (e) {
        console.error("Error initializing Recaptcha:", e);
    }
}

// Tab Switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;

        loginForm.classList.remove('active');
        signupForm.classList.remove('active');
        phoneForm.classList.remove('active');

        if (tab === 'login') loginForm.classList.add('active');
        else if (tab === 'signup') signupForm.classList.add('active');
        else if (tab === 'phone') {
            phoneForm.classList.add('active');
            // Initialize Recaptcha when tab is shown
            setTimeout(initRecaptcha, 100); // Small delay to ensure DOM is updated
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

sendOtpBtn.addEventListener('click', async () => {
    console.log("Send OTP clicked");
    const phoneNumber = phoneNumberInput.value;
    phoneError.textContent = '';

    if (!phoneNumber) {
        phoneError.textContent = 'Please enter a phone number.';
        return;
    }

    // Basic format check
    if (!phoneNumber.startsWith('+')) {
        phoneError.textContent = 'Phone number must start with + (e.g., +15555555555)';
        return;
    }

    try {
        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = "Sending...";

        if (!window.recaptchaVerifier) {
            console.log("Recaptcha not initialized, initializing now...");
            initRecaptcha();
        }

        const appVerifier = window.recaptchaVerifier;
        console.log("Signing in with phone number:", phoneNumber);

        confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        console.log("SMS sent");

        // SMS sent. Prompt user to type the code from the message.
        otpContainer.classList.remove('hidden');
        sendOtpBtn.classList.add('hidden');
        alert('OTP Sent! Please check your phone.');

    } catch (error) {
        console.error("Error sending OTP:", error);
        phoneError.textContent = "Error: " + error.message;
        sendOtpBtn.disabled = false;
        sendOtpBtn.textContent = "Send OTP";

        // Reset reCAPTCHA so user can try again
        if (window.recaptchaVerifier) {
            try {
                window.recaptchaVerifier.render().then(function (widgetId) {
                    grecaptcha.reset(widgetId);
                });
            } catch (e) {
                console.error("Error resetting recaptcha", e);
            }
        }
    }
});

verifyOtpBtn.addEventListener('click', async () => {
    const code = otpInput.value;
    phoneError.textContent = '';

    if (!code) {
        phoneError.textContent = 'Please enter the OTP.';
        return;
    }

    try {
        const result = await confirmationResult.confirm(code);
        const user = result.user;

        // Check if user exists in Firestore, if not create them
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            await setDoc(doc(db, "users", user.uid), {
                email: user.phoneNumber, // Use phone number as email/identifier
                role: 'user',
                status: 'pending',
                createdAt: new Date().toISOString()
            });

            // Sign out immediately as they are pending
            await signOut(auth);
            alert('Account created! Please wait for admin approval.');
            window.location.reload();
        } else {
            // User exists, let onAuthStateChanged handle it
        }

    } catch (error) {
        console.error(error);
        phoneError.textContent = 'Invalid OTP or error verifying.';
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
            await loadDynamicFields(); // Load fields config
            handleUserRouting(userDoc);
        } else {
            // Handle case where user exists in Auth but not Firestore
            console.log("User logged in but no Firestore doc found. Creating one now...");
            await setDoc(doc(db, "users", user.uid), {
                email: user.email || user.phoneNumber,
                role: 'user',
                status: 'pending',
                createdAt: new Date().toISOString()
            });
            await signOut(auth);
            alert('Account created! Please wait for admin approval.');
            window.location.reload();
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
        // Show setup button only for admin
        setupAdminBtn.classList.remove('hidden');
    } else {
        setupAdminBtn.classList.add('hidden');
        if (userData.status === 'approved') {
            showUserDashboard();
        } else {
            showPendingScreen();
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
    renderProfileForm();
    checkMissingFields();
}

async function showAdminDashboard() {
    adminDashboard.classList.remove('hidden');
    loadPendingUsers();
    renderFieldsList();
    loadAllUsers();
}

// --- Dynamic Fields Logic ---

async function loadDynamicFields() {
    const docRef = doc(db, "config", "profileFields");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        dynamicFields = docSnap.data().fields || [];
    } else {
        dynamicFields = [];
    }
}

// Admin: Add Field
addFieldBtn.addEventListener('click', async () => {
    const fieldName = newFieldNameInput.value.trim();
    if (!fieldName) return;

    // Check duplicate
    if (dynamicFields.some(f => f.name === fieldName)) {
        alert('Field already exists!');
        return;
    }

    dynamicFields.push({ name: fieldName, type: 'text' });

    await setDoc(doc(db, "config", "profileFields"), {
        fields: dynamicFields
    });

    newFieldNameInput.value = '';
    renderFieldsList();
    loadAllUsers(); // Refresh table to show new column
});

// Admin: Render Fields List
function renderFieldsList() {
    fieldsList.innerHTML = '';
    dynamicFields.forEach((field, index) => {
        const div = document.createElement('div');
        div.className = 'field-item';
        div.innerHTML = `
            <span>${field.name}</span>
            <button class="btn-sm btn-danger" onclick="deleteField(${index})">Delete</button>
        `;
        fieldsList.appendChild(div);
    });
}

// Admin: Delete Field
window.deleteField = async (index) => {
    if (!confirm('Are you sure? This will hide the field from profiles.')) return;
    dynamicFields.splice(index, 1);
    await setDoc(doc(db, "config", "profileFields"), {
        fields: dynamicFields
    });
    renderFieldsList();
    loadAllUsers();
};

// Admin: Load All Users with Dynamic Columns
async function loadAllUsers() {
    userTableBody.innerHTML = '<tr><td colspan="100%">Loading...</td></tr>';

    const q = query(collection(db, "users"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        userTableBody.innerHTML = '<tr><td colspan="100%">No users found.</td></tr>';
        return;
    }

    // 1. Collect all unique keys from all users
    const allKeys = new Set();
    const users = [];

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push(data);
        Object.keys(data).forEach(key => allKeys.add(key));
    });

    // 2. Filter out standard keys to identify "extra" fields
    const standardKeys = ['email', 'role', 'status', 'createdAt', 'uid'];
    const extraKeys = Array.from(allKeys).filter(key => !standardKeys.includes(key));

    // 3. Update Header
    userTableHead.innerHTML = `
        <th>Email</th>
        <th>Role</th>
        <th>Status</th>
        <th>Created At</th>
        ${extraKeys.map(key => `<th>${key}</th>`).join('')}
    `;

    // 4. Render Rows
    userTableBody.innerHTML = '';
    users.forEach(user => {
        const tr = document.createElement('tr');

        // Format date
        const dateStr = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-';

        // Generate cells for extra keys
        const extraCells = extraKeys.map(key => `<td>${user[key] || '-'}</td>`).join('');

        tr.innerHTML = `
            <td>${user.email || '-'}</td>
            <td>${user.role || '-'}</td>
            <td>${user.status || '-'}</td>
            <td>${dateStr}</td>
            ${extraCells}
        `;
        userTableBody.appendChild(tr);
    });
}

// User: Render Profile Form
function renderProfileForm() {
    dynamicProfileFields.innerHTML = '';
    dynamicFields.forEach(field => {
        const div = document.createElement('div');
        div.className = 'input-group';
        div.innerHTML = `
            <label>${field.name}</label>
            <input type="text" name="${field.name}" value="${userDoc[field.name] || ''}" placeholder="Enter ${field.name}">
        `;
        dynamicProfileFields.appendChild(div);
    });
}

// User: Toggle Profile Section
editProfileBtn.addEventListener('click', () => {
    profileSection.classList.toggle('hidden');
});

// User: Save Profile
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(profileForm);
    const updates = {};

    dynamicFields.forEach(field => {
        updates[field.name] = formData.get(field.name);
    });

    try {
        await updateDoc(doc(db, "users", currentUser.uid), updates);
        userDoc = { ...userDoc, ...updates }; // Update local state
        alert('Profile updated!');
        profileSection.classList.add('hidden');
    } catch (error) {
        console.error("Error updating profile:", error);
        alert('Error updating profile.');
    }
});

// User: Check Missing Fields
function checkMissingFields() {
    const missing = dynamicFields.filter(f => !userDoc[f.name]);
    if (missing.length > 0) {
        // Show notification or auto-open profile
        profileSection.classList.remove('hidden');
        // Optional: Alert user
        // alert(`Please complete your profile. Missing: ${missing.map(f => f.name).join(', ')}`);
    }
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
