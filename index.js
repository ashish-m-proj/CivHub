import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ==========================================
// 1. FIREBASE SETUP
// ==========================================
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCp8TJP11Zjr287DgInGo-V4nUyEarX0I4",
  authDomain: "civhub-ee902.firebaseapp.com",
  projectId: "civhub-ee902",
  storageBucket: "civhub-ee902.firebasestorage.app",
  messagingSenderId: "496685805070",
  appId: "1:496685805070:web:738ef80145598b0c8c965f",
  measurementId: "G-87Q29DEJ5R"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const brcrEmails = ['admin@ce.iitr.ac.in', 'rahul@ce.iitr.ac.in', 'ashish@ce.iitr.ac.in'];

// ==========================================
// 2. DOM ELEMENTS (Auth)
// ==========================================
const mainBody = document.getElementById('main-body');
const userProfileSection = document.getElementById('user-profile-section');
const guestLoginSection = document.getElementById('guest-login-section');
const headerLoginBtn = document.getElementById('header-login-btn');

// NEW: Header Profile Elements
const headerUserProfile = document.getElementById('header-user-profile');
const headerUserName = document.getElementById('header-user-name');
const headerUserAvatar = document.getElementById('header-user-avatar');

const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');
const userAvatarEl = document.getElementById('user-avatar');
// Note: If you changed userRoleBadge to querySelectorAll previously, keep that change here
const userRoleBadge = document.querySelectorAll('#user-role-badge'); 
const logoutBtn = document.getElementById('logout-btn');

// ==========================================
// 3. DOM ELEMENTS (SPA Routing)
// ==========================================
const navLinks = document.querySelectorAll('.nav-link');
const pageViews = document.querySelectorAll('.page-view');
const headerTitle = document.getElementById('header-title');

// ==========================================
// 4. AUTHENTICATION LOGIC
// ==========================================
onAuthStateChanged(auth, (user) => {
  mainBody.classList.remove('opacity-0');

  if (user) {
    // Logged In
    userProfileSection.classList.remove('hidden');
    guestLoginSection.classList.add('hidden');
    if (headerLoginBtn) headerLoginBtn.classList.add('hidden');
    if (headerUserProfile) headerUserProfile.classList.remove('hidden'); // Show header profile
    
    const emailStr = user.email.toLowerCase();
    const nameStr = emailStr.split('@')[0]; 
    const capitalizedName = nameStr.charAt(0).toUpperCase() + nameStr.slice(1);
    const isBrcr = brcrEmails.includes(emailStr);

    // Populate Sidebar info
    if (userNameEl) userNameEl.innerText = capitalizedName;
    if (userEmailEl) userEmailEl.innerText = emailStr;
    if (userAvatarEl) userAvatarEl.innerText = capitalizedName.charAt(0).toUpperCase();

    // NEW: Populate Header info
    if (headerUserName) headerUserName.innerText = capitalizedName;
    if (headerUserAvatar) headerUserAvatar.innerText = capitalizedName.charAt(0).toUpperCase();

    userRoleBadge.forEach(badge => {
      if(isBrcr) {
        badge.innerText = "BR / Admin";
        badge.className = "mt-2 inline-block bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-xs font-bold border border-rose-100";
      } else {
        badge.innerText = "Student";
        badge.className = "mt-2 inline-block bg-brand-50 text-brand-700 px-2 py-0.5 rounded text-xs font-bold border border-brand-100";
      }
    });
  } else {
    // Guest View
    userProfileSection.classList.add('hidden');
    guestLoginSection.classList.remove('hidden');
    if (headerLoginBtn) headerLoginBtn.classList.remove('hidden');
    if (headerUserProfile) headerUserProfile.classList.add('hidden'); // Hide header profile
    
    userRoleBadge.forEach(badge => {
      badge.innerText = "Guest Preview";
      badge.className = "mt-2 inline-block bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs font-bold border border-slate-300";
    });
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try { await signOut(auth); } 
    catch (error) { console.error("Error signing out:", error); }
  });
}

// ==========================================
// 5. SPA ROUTING LOGIC
// ==========================================
function switchView(targetId, title) {
  // 1. Hide all page views
  pageViews.forEach(view => {
    view.classList.add('hidden');
    view.classList.remove('block');
  });

  // 2. Show the targeted page view
  const targetView = document.getElementById(targetId);
  if (targetView) {
    targetView.classList.remove('hidden');
    targetView.classList.add('block');
  }

  // 3. Update the Top Header Breadcrumb Text
  if (headerTitle && title) {
    headerTitle.innerText = title;
  }

  // 4. Update Sidebar Styling (Active/Inactive states)
  navLinks.forEach(link => {
    if (link.dataset.target === targetId) {
      // Set Active Styling
      link.classList.remove('text-slate-400', 'hover:bg-slate-800', 'hover:text-white');
      link.classList.add('bg-brand-600', 'text-white');
    } else {
      // Set Inactive Styling
      link.classList.remove('bg-brand-600', 'text-white');
      link.classList.add('text-slate-400', 'hover:bg-slate-800', 'hover:text-white');
    }
  });
}

// Attach click listeners to all sidebar links
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault(); // Stop standard link behavior
    const target = link.dataset.target;
    const title = link.dataset.title;
    
    // Switch the view!
    switchView(target, title);
  });
});