import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-init.js';
import { initThemeToggle } from './theme-toggle.js';
import { escapeHTML } from './utils.js';

// brcrEmails is now UI-only — real admin gating lives in Firestore Rules (roles/{uid})
const brcrEmails = ['ashish_m@ce.iitr.ac.in', 'anushka_rv@ce.iitr.ac.in'];

// ==========================================
// 2. DOM ELEMENTS (Auth)
// ==========================================
const mainBody = document.getElementById('main-body');
const userProfileSection = document.getElementById('user-profile-section');
const guestLoginSection = document.getElementById('guest-login-section');
const contributorPoints = document.getElementById('contributor-points');

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
const moderationLink = document.getElementById('moderation-link');
const adminSectionLabel = document.getElementById('admin-section-label');

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
    if (contributorPoints) contributorPoints.classList.remove('hidden');
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
        // Real admin check for the Moderation Queue link — separate from
        // the isBrcr badge above, which is cosmetic only. This checks the
        // actual roles/{uid} collection that Firestore Rules also enforce.
        getDoc(doc(db, "roles", user.uid)).then((roleSnap) => {
          const isAdmin = roleSnap.exists() && roleSnap.data().role === "admin";
          if (isAdmin) {
            moderationLink.classList.remove('hidden');
            moderationLink.classList.add('flex');
            adminSectionLabel.classList.remove('hidden');
            // ADD THIS NEW LINE:
            if (document.getElementById('admin-panel')) document.getElementById('admin-panel').classList.remove('hidden');
          }
        }).catch((err) => console.error("Role check failed:", err));
  } else {
    // Guest View
    userProfileSection.classList.add('hidden');
    guestLoginSection.classList.remove('hidden');
    if (contributorPoints) contributorPoints.classList.add('hidden');
    if (headerUserProfile) headerUserProfile.classList.add('hidden'); // Hide header profile
        moderationLink.classList.add('hidden');
        moderationLink.classList.remove('flex');
        adminSectionLabel.classList.add('hidden');
    
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
  if (targetId === 'view-study') {
    loadStudyMaterials();
  }
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

// ==========================================
// 6. DYNAMIC DATA RENDERING (FIRESTORE)
// ==========================================

async function loadStudyMaterials() {
  const studyTbody = document.getElementById('study-materials-tbody');
  const dashRecentTbody = document.getElementById('dash-recent-materials-tbody');
  const dashStatMaterials = document.getElementById('dash-stat-materials');
  const dashStatMaterialsTrend = document.getElementById('dash-stat-materials-trend');
  
  if (!studyTbody && !dashRecentTbody) return;

  try {
    const q = query(
    collection(db, "studyMaterials"),
    where("status", "==", "approved"),
    orderBy("timestamp", "desc")
  );
  const querySnapshot = await getDocs(q);
  const materials = [];

  querySnapshot.forEach((doc) => {
    materials.push({ id: doc.id, ...doc.data() });
  });

    // 1. Update Dashboard Stats
    if (dashStatMaterials) {
      dashStatMaterials.innerText = materials.length;
      if (dashStatMaterialsTrend) {
        dashStatMaterialsTrend.innerHTML = `<i class="fas fa-check-circle text-emerald-500"></i> Verified resources online`;
      }
    }

    // 2. Update Dashboard Recent Materials Table (Top 5)
    if (dashRecentTbody) {
      dashRecentTbody.innerHTML = '';
      if (materials.length === 0) {
        dashRecentTbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-slate-400 dark:text-slate-500">No materials uploaded yet.</td></tr>`;
      } else {
        const recentItems = materials.slice(0, 5);
        recentItems.forEach((data) => {
          const fileUrl = data.fileUrl || '#';
          dashRecentTbody.innerHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors">
              <td class="px-6 py-3 flex items-center gap-3">
                <i class="fas fa-file-pdf text-red-500 text-lg"></i>
                <a href="${escapeHTML(fileUrl)}" target="_blank" rel="noopener noreferrer" class="font-medium text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">${escapeHTML(data.name) || 'Untitled Document'}</a>
              </td>
              <td class="px-6 py-3 text-slate-600 dark:text-slate-300">${escapeHTML(data.subject) || 'General'}</td>
              <td class="px-6 py-3">
                <span class="bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md text-xs">${escapeHTML(data.type) || 'Resource'}</span>
              </td>
              <td class="px-6 py-3 text-slate-400 dark:text-slate-500">${escapeHTML(data.date) || 'Recent'}</td>
            </tr>
          `;
        });
      }
    }

    // 3. Update Study Materials Directory Table (All Items)
    if (studyTbody) {
      studyTbody.innerHTML = '';
      if (materials.length === 0) {
        studyTbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-slate-400 dark:text-slate-500">No materials found.</td></tr>`;
      } else {
        materials.forEach((data) => {
          const fileUrl = data.fileUrl || '#';
          studyTbody.innerHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-white/[0.05] group transition-colors">
              <td class="px-6 py-4 flex items-center gap-3">
                <i class="fas fa-file-pdf text-red-500 text-xl"></i>
                <div>
                  <a href="${escapeHTML(fileUrl)}" target="_blank" rel="noopener noreferrer" class="font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors">${escapeHTML(data.name) || 'Untitled Document'}</a>
                </div>
              </td>
              <td class="px-6 py-4 text-slate-600 dark:text-slate-300">${escapeHTML(data.subject) || 'General'}</td>
              <td class="px-6 py-4">
                <span class="bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md text-xs border dark:border-white/5">${escapeHTML(data.type) || 'Resource'}</span>
              </td>
              <td class="px-6 py-4 text-slate-600 dark:text-slate-300">${escapeHTML(data.uploader) || 'Anonymous'}</td>
              <td class="px-6 py-4 text-slate-600 dark:text-slate-300">${escapeHTML(data.date) || 'Today'}</td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href="${escapeHTML(fileUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-500/30 text-xs font-semibold transition-colors">
                    <i class="fas fa-arrow-up-right-from-square"></i> Open
                  </a>
                </div>
              </td>
            </tr>
          `;
        });
      }
    }

  } catch (error) {
    console.error("Error loading study materials:", error);
    if (studyTbody) studyTbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-rose-500">Failed to load data.</td></tr>`;
    if (dashRecentTbody) dashRecentTbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-rose-500">Failed to load data.</td></tr>`;
  }
}

// Automatically load data when Dashboard is ready
document.addEventListener("DOMContentLoaded", () => {
  loadStudyMaterials();
});

initThemeToggle();

// 1. Handle showing/hiding Event specific fields
const typeSelect = document.getElementById('admin-type');
const dateInput = document.getElementById('admin-date');
const locInput = document.getElementById('admin-location');

if (typeSelect) {
  typeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'event') {
      dateInput.classList.remove('hidden');
      locInput.classList.remove('hidden');
      dateInput.required = true;
    } else {
      dateInput.classList.add('hidden');
      locInput.classList.add('hidden');
      dateInput.required = false;
    }
  });
}

// 2. Handle Form Submission
const adminForm = document.getElementById('admin-form');
if (adminForm) {
  adminForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page reload
    
    const type = typeSelect.value;
    const title = document.getElementById('admin-title').value;
    const desc = document.getElementById('admin-desc').value;
    const feedback = document.getElementById('admin-feedback');
    
    feedback.textContent = "Saving...";
    feedback.className = "mt-3 text-sm text-slate-500 block";

    try {
      if (type === 'announcement') {
        await addDoc(collection(db, "announcements"), {
          title: title,
          body: desc,
          timestamp: Timestamp.now()
        });
      } else if (type === 'club') {
        await addDoc(collection(db, "clubs"), {
          name: title,
          description: desc,
          active: true // Default all new clubs to active
        });
      } else if (type === 'event') {
        // Convert HTML date string to Firebase Timestamp
        const dateVal = new Date(document.getElementById('admin-date').value);
        await addDoc(collection(db, "events"), {
          title: title,
          description: desc,
          location: document.getElementById('admin-location').value,
          date: Timestamp.fromDate(dateVal)
        });
      }
      
      feedback.textContent = `Successfully added new ${type}!`;
      feedback.className = "mt-3 text-sm text-emerald-600 block";
      adminForm.reset(); // Clear form fields
      
      // Optional: hide event fields again if event was submitted
      dateInput.classList.add('hidden');
      locInput.classList.add('hidden');
      dateInput.required = false;
      typeSelect.value = 'announcement'; 

    } catch (error) {
      console.error("Error adding document:", error);
      feedback.textContent = "Error: " + error.message;
      feedback.className = "mt-3 text-sm text-rose-500 block";
    }
  });
}