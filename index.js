import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-init.js';
import { initThemeToggle } from './theme-toggle.js';
import { escapeHTML } from './utils.js';

// brcrEmails is now UI-only — real admin gating lives in Firestore Rules (roles/{uid})
const brcrEmails = ['ashish_m@ce.iitr.ac.in', 'anushka_rv@ce.iitr.ac.in', 'boya_rk@ce.iitr.ac.in'];

// ==========================================
// 2. DOM ELEMENTS (Auth)
// ==========================================
const mainBody = document.getElementById('main-body');
const userProfileSection = document.getElementById('user-profile-section');
const guestLoginSection = document.getElementById('guest-login-section');
const contributorPoints = document.getElementById('contributor-points');

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
// Mobile Sidebar Toggle
// ==========================================
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');

function openSidebar() {
  sidebar.classList.remove('-translate-x-full');
  sidebarBackdrop.classList.remove('hidden');
}
function closeSidebar() {
  sidebar.classList.add('-translate-x-full');
  sidebarBackdrop.classList.add('hidden');
}

if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openSidebar);
if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

// ==========================================
// 4. AUTHENTICATION LOGIC
// ==========================================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Guests aren't allowed on the dashboard — send them to log in.
    window.location.href = "login.html";
    return;
  }

  mainBody.classList.remove('opacity-0');

  // Logged In
  userProfileSection.classList.remove('hidden');
  guestLoginSection.classList.add('hidden');
  if (contributorPoints) contributorPoints.classList.remove('hidden');

    const emailStr = user.email.toLowerCase();
    const nameStr = emailStr.split('@')[0]; 
    const capitalizedName = nameStr.charAt(0).toUpperCase() + nameStr.slice(1);
    const isBrcr = brcrEmails.includes(emailStr);

    // Populate Sidebar info
    if (userNameEl) userNameEl.innerText = capitalizedName;
    if (userEmailEl) userEmailEl.innerText = emailStr;
    if (userAvatarEl) userAvatarEl.innerText = capitalizedName.charAt(0).toUpperCase();

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
                    if (isAdmin || isBrcr) {
            moderationLink.classList.remove('hidden');
            moderationLink.classList.add('flex');
            adminSectionLabel.classList.remove('hidden');
            if (adminAddBtn) { adminAddBtn.classList.remove('hidden'); adminAddBtn.classList.add('flex'); }
          }
                }).catch((err) => console.error("Role check failed:", err));

  // Now that we know this is a real logged-in user, load dashboard data.
  loadStudyMaterials();
  loadAnnouncements();
  loadUpcomingEventsList();
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
    closeSidebar(); // no-op on desktop, closes the drawer on mobile
  });
});

// ==========================================
// 6. DYNAMIC DATA RENDERING (FIRESTORE)
// ==========================================

async function loadStudyMaterials() {
  const studyTbody = document.getElementById('study-materials-tbody');
  const dashRecentTbody = document.getElementById('dash-recent-materials-tbody');
  
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

async function loadUpcomingEventsList() {
  const container = document.getElementById('tab-content-events');
  const badge = document.getElementById('dash-events-badge');
  try {
    const now = new Date();
    const snap = await getDocs(query(collection(db, "events"), where("date", ">=", now), orderBy("date", "asc"), limit(5)));
    if (snap.empty) {
      container.innerHTML = `<p class="text-center py-6 text-slate-400 dark:text-slate-500">No upcoming events.</p>`;
      return;
    }
    container.innerHTML = '';
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const dateStr = data.date?.toDate ? data.date.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      container.insertAdjacentHTML('beforeend', `
        <div class="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3 last:border-0">
          <div>
            <p class="font-semibold text-slate-900 dark:text-white text-sm">${escapeHTML(data.title)}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHTML(data.location) || 'TBA'}</p>
          </div>
          <span class="text-xs font-medium text-brand-600 dark:text-brand-400">${escapeHTML(dateStr)}</span>
        </div>
      `);
    });
    if (badge) { badge.textContent = snap.size; badge.classList.remove('hidden'); }
  } catch (error) {
    console.error("Error loading events:", error);
    container.innerHTML = `<p class="text-center py-6 text-rose-500">Failed to load.</p>`;
  }
}

async function loadAnnouncements() {
  const container = document.getElementById('tab-content-announcements');
  const badge = document.getElementById('dash-announcements-badge');
  try {
    const snap = await getDocs(query(collection(db, "announcements"), orderBy("timestamp", "desc"), limit(5)));
    if (snap.empty) {
      container.innerHTML = `<p class="text-center py-6 text-slate-400 dark:text-slate-500">No announcements yet.</p>`;
      return;
    }
    container.innerHTML = '';
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      container.insertAdjacentHTML('beforeend', `
        <div class="border-b border-slate-100 dark:border-white/5 pb-3 last:border-0">
          <p class="font-semibold text-slate-900 dark:text-white text-sm">${escapeHTML(data.title)}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${escapeHTML(data.body)}</p>
        </div>
      `);
    });
    if (badge) { badge.textContent = snap.size; badge.classList.remove('hidden'); }
  } catch (error) {
    console.error("Error loading announcements:", error);
    container.innerHTML = `<p class="text-center py-6 text-rose-500">Failed to load.</p>`;
  }
}

initThemeToggle();

// ==========================================
// Admin: New Announcement / Event Modal
// ==========================================
const adminAddBtn = document.getElementById('admin-add-btn');
const adminModalBackdrop = document.getElementById('admin-modal-backdrop');
const adminModalBox = document.getElementById('admin-modal-box');
const adminModalClose = document.getElementById('admin-modal-close');

const typeSelect = document.getElementById('admin-type');
const dateField = document.getElementById('admin-date-field');
const locField = document.getElementById('admin-location-field');
const dateInput = document.getElementById('admin-date');
const locInput = document.getElementById('admin-location');

function openAdminModal() {
  adminModalBackdrop.classList.remove('hidden');
  adminModalBackdrop.classList.add('flex');
}
function closeAdminModal() {
  adminModalBackdrop.classList.add('hidden');
  adminModalBackdrop.classList.remove('flex');
  adminForm.reset();
  dateField.classList.add('hidden');
  locField.classList.add('hidden');
  dateInput.required = false;
  adminFeedback.classList.add('hidden');
}

if (adminAddBtn) adminAddBtn.addEventListener('click', openAdminModal);
if (adminModalClose) adminModalClose.addEventListener('click', closeAdminModal);
if (adminModalBackdrop) {
  adminModalBackdrop.addEventListener('click', (e) => {
    if (e.target === adminModalBackdrop) closeAdminModal(); // ignore clicks inside the box
  });
}

// Toggle Event-only fields
if (typeSelect) {
  typeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'event') {
      dateField.classList.remove('hidden');
      locField.classList.remove('hidden');
      dateInput.required = true;
    } else {
      dateField.classList.add('hidden');
      locField.classList.add('hidden');
      dateInput.required = false;
    }
  });
}

// 2. Handle Form Submission
const adminForm = document.getElementById('admin-form');
const adminFeedback = document.getElementById('admin-feedback');

if (adminForm) {
  adminForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page reload

    const type = typeSelect.value;
    const title = document.getElementById('admin-title').value;
    const desc = document.getElementById('admin-desc').value;

    adminFeedback.textContent = "Saving...";
    adminFeedback.className = "text-sm text-slate-500 block";

    try {
      if (type === 'announcement') {
        await addDoc(collection(db, "announcements"), {
          title: title,
          body: desc,
          timestamp: Timestamp.now()
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

      adminFeedback.textContent = `Successfully added new ${type}!`;
      adminFeedback.className = "text-sm text-emerald-600 block";

      // Refresh the dashboard lists so the new item shows up immediately
      loadAnnouncements();
      loadUpcomingEventsList();

      setTimeout(closeAdminModal, 900);

    } catch (error) {
      console.error("Error adding document:", error);
      adminFeedback.textContent = "Error: " + error.message;
      adminFeedback.className = "text-sm text-rose-500 block";
    }
  });
}