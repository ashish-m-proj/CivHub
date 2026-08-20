import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// TODO: Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Role Data
const brcrEmails = ['admin@ce.iitr.ac.in', 'rahul@ce.iitr.ac.in', 'ashish@ce.iitr.ac.in'];

// DOM Elements
const mainBody = document.getElementById('main-body');

// UI Toggle Sections
const userProfileSection = document.getElementById('user-profile-section');
const guestLoginSection = document.getElementById('guest-login-section');
const headerLoginBtn = document.getElementById('header-login-btn');

// User Data Elements
const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');
const userAvatarEl = document.getElementById('user-avatar');
const userRoleBadge = document.getElementById('user-role-badge');
const logoutBtn = document.getElementById('logout-btn');

// Security Check: Is the user logged in?
onAuthStateChanged(auth, (user) => {
  // 1. Un-hide the entire application interface safely
  mainBody.classList.remove('opacity-0');

  if (user) {
    // ==========================================
    // LOGGED IN STATE
    // ==========================================
    
    // Hide Login buttons, Show Profile block
    userProfileSection.classList.remove('hidden');
    guestLoginSection.classList.add('hidden');
    if (headerLoginBtn) headerLoginBtn.classList.add('hidden');
    
    // Format data
    const emailStr = user.email.toLowerCase();
    const nameStr = emailStr.split('@')[0]; 
    const capitalizedName = nameStr.charAt(0).toUpperCase() + nameStr.slice(1);
    const isBrcr = brcrEmails.includes(emailStr);

    // Populate Sidebar info
    if (userNameEl) userNameEl.innerText = capitalizedName;
    if (userEmailEl) userEmailEl.innerText = emailStr;
    if (userAvatarEl) userAvatarEl.innerText = capitalizedName.charAt(0).toUpperCase();

    // Assign Role Badge
    if (userRoleBadge) {
      if(isBrcr) {
        userRoleBadge.innerText = "BR / Admin";
        userRoleBadge.className = "mt-2 inline-block bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-xs font-bold border border-rose-100";
      } else {
        userRoleBadge.innerText = "Student";
        userRoleBadge.className = "mt-2 inline-block bg-brand-50 text-brand-700 px-2 py-0.5 rounded text-xs font-bold border border-brand-100";
      }
    }

  } else {
    // ==========================================
    // GUEST (LOGGED OUT) STATE
    // ==========================================
    
    // Hide Profile block, Show Login buttons
    userProfileSection.classList.add('hidden');
    guestLoginSection.classList.remove('hidden');
    if (headerLoginBtn) headerLoginBtn.classList.remove('hidden');
    
    // Assign Guest Badge
    if (userRoleBadge) {
      userRoleBadge.innerText = "Guest Preview";
      userRoleBadge.className = "mt-2 inline-block bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs font-bold border border-slate-300";
    }
  }
});

// Handle Logout Button Click
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      // NOTE: We don't need to manually change the UI here.
      // Calling signOut() triggers the onAuthStateChanged() listener above,
      // which will instantly swap the UI back to the Guest state.
    } catch (error) {
      console.error("Error signing out:", error);
    }
  });
}