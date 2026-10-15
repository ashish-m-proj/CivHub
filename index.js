import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, addDoc, updateDoc, deleteDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-init.js';
import { initThemeToggle } from './theme-toggle.js';
import { escapeHTML } from './utils.js';
import { ALL_SEMESTERS, getSubjectsForSemester, populateSelect } from './curriculum-data.js';
import { CLUB_CATEGORIES } from './clubs-data.js';
import { ACADEMIC_CALENDAR, CATEGORY_META, CATEGORY_IDS } from './academic-calendar-data.js';
import { TIMETABLE_DAYS, TIMETABLE_BATCHES, TIMETABLE_SLOTS, TIMETABLE_TYPE_META, TIMETABLE_ENTRIES } from './timetable-data.js';

// brcrEmails is now UI-only — real admin gating lives in Firestore Rules (roles/{uid})
const brcrEmails = ['ashish_m@ce.iitr.ac.in', 'saksham_h@ce.iitr.ac.in', 'boya_rk@ce.iitr.ac.in'];

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
// The currently signed-in Firebase user, kept at module scope so the
// "My Uploads" section (and anything else that needs "my own docs") can
// query Firestore by uploaderUid without threading the user through props.
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    // Guests aren't allowed on the dashboard — send them to log in.
    window.location.href = "login.html";
    return;
  }

  currentUser = user;
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

    function setRoleBadge(isAdminRole) {
      userRoleBadge.forEach(badge => {
        if (isAdminRole) {
          badge.innerText = "BR / Admin";
          badge.className = "mt-2 inline-block bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-xs font-bold border border-rose-100";
        } else {
          badge.innerText = "Student";
          badge.className = "mt-2 inline-block bg-brand-50 text-brand-700 px-2 py-0.5 rounded text-xs font-bold border border-brand-100";
        }
      });
    }

    // Show "Student" immediately so the badge isn't stuck on "Loading..."
    // while the real role check below is in flight. brcrEmails is no longer
    // used to decide the badge text — only the actual roles/{uid} doc does,
    // so the badge can never say something the real access level disagrees with.
    setRoleBadge(false);

    // Real admin check — this drives BOTH the badge and the Moderation Queue
    // link, so they can no longer contradict each other. This checks the
    // actual roles/{uid} collection that Firestore Rules also enforce.
    getDoc(doc(db, "roles", user.uid)).then((roleSnap) => {
      const isAdmin = roleSnap.exists() && roleSnap.data().role === "admin";

      setRoleBadge(isAdmin);

      if (isAdmin || isBrcr) {
        moderationLink.classList.remove('hidden');
        moderationLink.classList.add('flex');
        adminSectionLabel.classList.remove('hidden');
        if (adminAddBtn) { adminAddBtn.classList.remove('hidden'); adminAddBtn.classList.add('flex'); }
      }
      setCalendarAdmin(isAdmin || isBrcr);
    }).catch((err) => console.error("Role check failed:", err));

  // Now that we know this is a real logged-in user, load dashboard data.
  loadStudyMaterials();
  loadAnnouncements();
  loadUpcomingEventsList();
  initCalendarPage();
  initTimetablePage();
  loadMyUploads();
  loadSavedResources();
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
  if (targetId === 'view-uploads') {
    loadMyUploads();
  }
  if (targetId === 'view-timetable') {
    initTimetablePage();
  }
  if (targetId === 'view-saved') {
    loadSavedResources();
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

// Wire up dashboard quick-action cards + "View All" — these previously
// looked clickable (cursor-pointer, hover states) but had no handler.
const quickActionStudy = document.getElementById('quick-action-study');
const quickActionClubs = document.getElementById('quick-action-clubs');
const dashViewAllBtn = document.getElementById('dash-view-all-btn');

if (quickActionStudy) {
  quickActionStudy.addEventListener('click', () => switchView('view-study', 'Study Materials / Repository'));
}
if (quickActionClubs) {
  quickActionClubs.addEventListener('click', () => switchView('view-clubs', 'Campus Clubs / Directory'));
}
if (dashViewAllBtn) {
  dashViewAllBtn.addEventListener('click', () => switchView('view-study', 'Study Materials / Repository'));
}

// ==========================================
// 6. DYNAMIC DATA RENDERING (FIRESTORE)
// ==========================================

// Full set of approved materials fetched once per load; filtering/pagination
// below operates on this in-memory copy so the UI stays snappy.
let allApprovedMaterials = [];
const studyFilters = { search: '', semester: '', subject: '', type: '' };
let studyCurrentPage = 1;
const STUDY_PAGE_SIZE = 8;

// Picks a file-type icon from the file's extension instead of always
// showing a PDF icon regardless of what was actually uploaded.
function iconForFile(fileUrl, type) {
  const ext = (fileUrl || '').split('?')[0].split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return { icon: 'fa-file-image', color: 'text-emerald-500' };
  if (['doc', 'docx'].includes(ext)) return { icon: 'fa-file-word', color: 'text-blue-500' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { icon: 'fa-file-excel', color: 'text-green-600' };
  if (['ppt', 'pptx'].includes(ext)) return { icon: 'fa-file-powerpoint', color: 'text-orange-500' };
  if (ext === 'pdf') return { icon: 'fa-file-pdf', color: 'text-red-500' };
  return { icon: 'fa-file-lines', color: 'text-slate-400' };
}

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
          const fi = iconForFile(fileUrl, data.type);
          dashRecentTbody.innerHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors">
              <td class="px-6 py-3 flex items-center gap-3">
                <i class="fas ${fi.icon} ${fi.color} text-lg"></i>
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

    // 3. Store materials + render the filterable/paginated Study Materials view
    allApprovedMaterials = materials;
    if (studyTbody) {
      renderStudySection();
    }

  } catch (error) {
    console.error("Error loading study materials:", error);
    if (studyTbody) studyTbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-rose-500">Failed to load data.</td></tr>`;
    if (dashRecentTbody) dashRecentTbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-rose-500">Failed to load data.</td></tr>`;
  }
}

// ==========================================
// 6b. STUDY MATERIALS: FILTERING, SUBJECT CARDS, PAGINATION
// ==========================================

function materialMatchesFilters(m, { ignoreSubject = false } = {}) {
  if (studyFilters.semester && m.semester !== studyFilters.semester) return false;
  if (studyFilters.type && m.type !== studyFilters.type) return false;
  if (!ignoreSubject && studyFilters.subject && m.subject !== studyFilters.subject) return false;
  if (studyFilters.search) {
    const needle = studyFilters.search.toLowerCase();
    const haystack = `${m.name || ''} ${m.subject || ''} ${m.type || ''} ${m.uploader || ''}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

function renderSubjectCards(filtered) {
  const container = document.getElementById('study-subject-cards');
  if (!container) return;

  // Counts ignore the current subject filter so every subject with matching
  // documents still shows up as a clickable option, not just the selected one.
  const scoped = allApprovedMaterials.filter(m => materialMatchesFilters(m, { ignoreSubject: true }));
  const counts = {};
  scoped.forEach(m => {
    const subj = m.subject || 'Uncategorized';
    counts[subj] = (counts[subj] || 0) + 1;
  });

  const subjects = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (subjects.length === 0) {
    container.innerHTML = `<p class="text-sm text-slate-400 dark:text-slate-500 col-span-full">No subjects match the current filters yet.</p>`;
    return;
  }

  container.innerHTML = subjects.map(([subject, count]) => {
    const isActive = studyFilters.subject === subject;
    return `
      <div data-subject="${escapeHTML(subject)}" class="study-subject-card bg-white dark:bg-white/[0.03] dark:backdrop-blur-lg border ${isActive ? 'border-brand-500 dark:border-brand-400' : 'border-slate-200 dark:border-white/10'} rounded-xl p-4 shadow-sm hover:border-brand-400 dark:hover:border-white/30 cursor-pointer transition-all flex items-center gap-4 group">
        <div class="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-500/20 text-brand-600 dark:text-blue-400 flex items-center justify-center text-2xl group-hover:bg-brand-600 group-hover:text-white transition-colors"><i class="fas fa-folder"></i></div>
        <div><h3 class="font-bold text-slate-900 dark:text-white">${escapeHTML(subject)}</h3><p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${count} File${count === 1 ? '' : 's'}</p></div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.study-subject-card').forEach(card => {
    card.addEventListener('click', () => {
      const subject = card.dataset.subject;
      const subjectSelect = document.getElementById('study-subject-filter');
      // Toggle off if clicking the already-active subject
      studyFilters.subject = studyFilters.subject === subject ? '' : subject;
      if (subjectSelect) subjectSelect.value = studyFilters.subject;
      studyCurrentPage = 1;
      renderStudySection();
    });
  });
}

function renderStudyTable(filtered) {
  const studyTbody = document.getElementById('study-materials-tbody');
  const infoEl = document.getElementById('study-pagination-info');
  const prevBtn = document.getElementById('study-prev-btn');
  const nextBtn = document.getElementById('study-next-btn');
  if (!studyTbody) return;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / STUDY_PAGE_SIZE));
  if (studyCurrentPage > totalPages) studyCurrentPage = totalPages;
  if (studyCurrentPage < 1) studyCurrentPage = 1;

  const start = (studyCurrentPage - 1) * STUDY_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + STUDY_PAGE_SIZE);

  if (total === 0) {
    studyTbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-slate-400 dark:text-slate-500">No materials match your filters.</td></tr>`;
  } else {
    studyTbody.innerHTML = pageItems.map((data) => {
      const fileUrl = data.fileUrl || '#';
      const fi = iconForFile(fileUrl, data.type);
      const isSaved = savedMaterialIds.has(data.id);
      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-white/[0.05] group transition-colors">
          <td class="px-6 py-4 flex items-center gap-3">
            <i class="fas ${fi.icon} ${fi.color} text-xl"></i>
            <div>
              <div class="flex items-center gap-1.5">
                <a href="${escapeHTML(fileUrl)}" target="_blank" rel="noopener noreferrer" class="font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors">${escapeHTML(data.name) || 'Untitled Document'}</a>
                ${isSaved ? '<i class="fas fa-bookmark text-amber-500 text-[11px]" title="Saved"></i>' : ''}
              </div>
            </div>
          </td>
          <td class="px-6 py-4 text-slate-600 dark:text-slate-300">${escapeHTML(data.subject) || 'General'}</td>
          <td class="px-6 py-4">
            <span class="bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md text-xs border dark:border-white/5">${escapeHTML(data.type) || 'Resource'}</span>
          </td>
          <td class="px-6 py-4 text-slate-600 dark:text-slate-300">${escapeHTML(data.uploader) || 'Anonymous'}</td>
          <td class="px-6 py-4 text-slate-600 dark:text-slate-300">
            ${escapeHTML(data.date) || 'Today'}
            ${data.reviewedBy ? `<p class="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Verified by ${escapeHTML(data.reviewedBy)}</p>` : ''}
          </td>
          <td class="px-6 py-4 text-right">
            <div class="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button data-id="${escapeHTML(data.id)}" class="save-material-btn ${isSaved ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400'} transition-colors" title="${isSaved ? 'Remove from Saved Resources' : 'Save to Saved Resources'}">
                <i class="fa${isSaved ? 's' : 'r'} fa-bookmark text-sm"></i>
              </button>
              <a href="${escapeHTML(fileUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-500/30 text-xs font-semibold transition-colors">
                <i class="fas fa-arrow-up-right-from-square"></i> Open
              </a>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  attachStudyRowListeners();

  if (infoEl) {
    infoEl.textContent = total === 0
      ? 'No entries'
      : `Showing ${start + 1} to ${Math.min(start + STUDY_PAGE_SIZE, total)} of ${total} entries`;
  }

  if (prevBtn) {
    prevBtn.disabled = studyCurrentPage <= 1;
    prevBtn.classList.toggle('cursor-not-allowed', prevBtn.disabled);
    prevBtn.classList.toggle('text-slate-400', prevBtn.disabled);
    prevBtn.classList.toggle('dark:text-slate-500', prevBtn.disabled);
    prevBtn.classList.toggle('hover:bg-slate-50', !prevBtn.disabled);
    prevBtn.classList.toggle('dark:hover:bg-white/5', !prevBtn.disabled);
    prevBtn.classList.toggle('text-slate-600', !prevBtn.disabled);
    prevBtn.classList.toggle('dark:text-slate-300', !prevBtn.disabled);
  }
  if (nextBtn) {
    nextBtn.disabled = studyCurrentPage >= totalPages;
    nextBtn.classList.toggle('cursor-not-allowed', nextBtn.disabled);
    nextBtn.classList.toggle('text-slate-400', nextBtn.disabled);
    nextBtn.classList.toggle('dark:text-slate-500', nextBtn.disabled);
    nextBtn.classList.toggle('hover:bg-slate-50', !nextBtn.disabled);
    nextBtn.classList.toggle('dark:hover:bg-white/5', !nextBtn.disabled);
    nextBtn.classList.toggle('text-slate-600', !nextBtn.disabled);
    nextBtn.classList.toggle('dark:text-slate-300', !nextBtn.disabled);
  }
}

function attachStudyRowListeners() {
  document.querySelectorAll('.save-material-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.dataset.id;
      const material = allApprovedMaterials.find(m => m.id === id);
      if (material) toggleSaveMaterial(material, btn);
    });
  });
}

function renderStudySection() {
  const filtered = allApprovedMaterials.filter(m => materialMatchesFilters(m));
  renderSubjectCards(filtered);
  renderStudyTable(filtered);
}

// Wire up filter controls (present in the DOM from page load, even while
// the Study Materials view is hidden behind the SPA router).
const studySearchInput = document.getElementById('study-search-input');
const studySemesterFilter = document.getElementById('study-semester-filter');
const studySubjectFilter = document.getElementById('study-subject-filter');
const studyTypeFilter = document.getElementById('study-type-filter');
const studyPrevBtn = document.getElementById('study-prev-btn');
const studyNextBtn = document.getElementById('study-next-btn');

// Populates the Semester dropdown straight from curriculum-data.js so it
// can never drift out of sync with the actual curriculum.
function populateSemesterFilterOptions() {
  if (!studySemesterFilter) return;
  const previousValue = studySemesterFilter.value;
  populateSelect(studySemesterFilter, ALL_SEMESTERS, 'All Semesters', previousValue);
  // "All Semesters" is a real, selectable choice here (unlike a required
  // form field), so make sure it isn't left disabled/unselected.
  const allOption = studySemesterFilter.querySelector('option[value=""]');
  if (allOption) allOption.disabled = false;
  if (!previousValue) studySemesterFilter.value = '';
}

// Rebuilds the Subject dropdown's options to match the selected Semester.
// A semester must be chosen first — until then the Subject filter stays
// disabled so a subject can't be picked out of context (same cascade as
// the Contribute Material page). Keeps the current selection if it's
// still valid for the new semester, otherwise resets it.
function refreshSubjectFilterOptions() {
  if (!studySubjectFilter) return;
  const semester = studySemesterFilter ? studySemesterFilter.value : '';
  const subjects = semester ? getSubjectsForSemester(semester) : [];
  const previousValue = studySubjectFilter.value;

  populateSelect(
    studySubjectFilter,
    subjects,
    semester ? 'All Subjects' : 'Select semester first',
    subjects.includes(previousValue) ? previousValue : ''
  );
  studySubjectFilter.disabled = !semester;

  // "All Subjects" should be selectable once a semester is chosen, whereas
  // the "Select semester first" placeholder should not be.
  const placeholderOption = studySubjectFilter.querySelector('option[value=""]');
  if (placeholderOption) placeholderOption.disabled = !semester;
}

function onStudyFilterChange() {
  studyFilters.search = studySearchInput ? studySearchInput.value.trim() : '';
  studyFilters.semester = studySemesterFilter ? studySemesterFilter.value : '';
  studyFilters.subject = (studySubjectFilter && !studySubjectFilter.disabled) ? studySubjectFilter.value : '';
  studyFilters.type = studyTypeFilter ? studyTypeFilter.value : '';
  studyCurrentPage = 1;
  renderStudySection();
}

function onStudySemesterFilterChange() {
  refreshSubjectFilterOptions();
  // Choosing a new semester invalidates whatever subject was picked before
  // (it belonged to the old, now-hidden, subject list), so drop it.
  studyFilters.subject = studySubjectFilter ? studySubjectFilter.value : '';
  onStudyFilterChange();
}

populateSemesterFilterOptions();
refreshSubjectFilterOptions();

if (studySearchInput) studySearchInput.addEventListener('input', onStudyFilterChange);
if (studySemesterFilter) studySemesterFilter.addEventListener('change', onStudySemesterFilterChange);
if (studySubjectFilter) studySubjectFilter.addEventListener('change', onStudyFilterChange);
if (studyTypeFilter) studyTypeFilter.addEventListener('change', onStudyFilterChange);
if (studyPrevBtn) studyPrevBtn.addEventListener('click', () => { studyCurrentPage--; renderStudySection(); });
if (studyNextBtn) studyNextBtn.addEventListener('click', () => { studyCurrentPage++; renderStudySection(); });

// ==========================================
// 6b-2. SAVED RESOURCES (Personal bookmarks) — lets a signed-in user
// bookmark any approved study material (the bookmark toggle lives on the
// Study Materials table) and organize bookmarks into named collections.
//
// Firestore collections used (make sure Firestore Rules allow a user to
// read/write only their own docs, e.g. `request.auth.uid == resource.data.uid`
// and `request.auth.uid == request.resource.data.uid` on create):
//   savedResources:   { uid, materialId, name, subject, type, semester,
//                       fileUrl, folder, savedAt }
//   savedCollections: { uid, name, createdAt }
// ==========================================
let allSavedResources = [];
let savedMaterialIds = new Set();
let savedCollections = [];
let savedCurrentPage = 1;
const SAVED_PAGE_SIZE = 8;
const savedFilters = { folder: 'all', search: '' };
const DEFAULT_SAVED_FOLDER = 'General';

async function toggleSaveMaterial(material, btn) {
  if (!currentUser || !material) return;
  const isSaved = savedMaterialIds.has(material.id);

  if (btn) btn.disabled = true;
  try {
    if (isSaved) {
      const existing = allSavedResources.find(s => s.materialId === material.id);
      if (existing) {
        await deleteDoc(doc(db, "savedResources", existing.id));
        allSavedResources = allSavedResources.filter(s => s.id !== existing.id);
      }
      savedMaterialIds.delete(material.id);
    } else {
      const payload = {
        uid: currentUser.uid,
        materialId: material.id,
        name: material.name || '',
        subject: material.subject || '',
        type: material.type || '',
        semester: material.semester || '',
        fileUrl: material.fileUrl || '',
        folder: DEFAULT_SAVED_FOLDER,
        savedAt: Timestamp.now()
      };
      const ref = await addDoc(collection(db, "savedResources"), payload);
      allSavedResources.unshift({ id: ref.id, ...payload });
      savedMaterialIds.add(material.id);
    }
    renderStudySection();
    renderSavedSection();
  } catch (error) {
    console.error("Failed to update saved resources:", error);
    alert("Couldn't update Saved Resources. You may need to sign in again, or Firestore Rules may not yet allow this — try refreshing.");
    if (btn) btn.disabled = false;
  }
}

function getSavedFolderList() {
  const counts = {};
  allSavedResources.forEach(s => {
    const f = s.folder || DEFAULT_SAVED_FOLDER;
    counts[f] = (counts[f] || 0) + 1;
  });
  const names = new Set(Object.keys(counts));
  savedCollections.forEach(c => names.add(c.name));
  names.add(DEFAULT_SAVED_FOLDER);
  return Array.from(names).sort((a, b) => a.localeCompare(b)).map(name => ({ name, count: counts[name] || 0 }));
}

function savedMatchesFilters(s) {
  const folder = s.folder || DEFAULT_SAVED_FOLDER;
  if (savedFilters.folder !== 'all' && folder !== savedFilters.folder) return false;
  if (savedFilters.search) {
    const needle = savedFilters.search.toLowerCase();
    const haystack = `${s.name || ''} ${s.subject || ''}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

function renderSavedFoldersGrid() {
  const container = document.getElementById('saved-folders-grid');
  if (!container) return;
  const folders = getSavedFolderList();

  container.innerHTML = folders.map(f => {
    const isActive = savedFilters.folder === f.name;
    return `
      <button type="button" data-folder="${escapeHTML(f.name)}" class="saved-folder-card text-left p-4 rounded-xl border transition-colors ${isActive ? 'border-brand-500 dark:border-brand-400 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.06]'}">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/20 text-brand-600 dark:text-blue-400 flex items-center justify-center text-lg shrink-0"><i class="fas fa-folder"></i></div>
          <div class="min-w-0">
            <p class="font-semibold text-slate-900 dark:text-white text-sm truncate">${escapeHTML(f.name)}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">${f.count} item${f.count === 1 ? '' : 's'}</p>
          </div>
        </div>
      </button>
    `;
  }).join('');

  container.querySelectorAll('.saved-folder-card').forEach(card => {
    card.addEventListener('click', () => {
      const folder = card.dataset.folder;
      savedFilters.folder = savedFilters.folder === folder ? 'all' : folder;
      savedCurrentPage = 1;
      renderSavedSection();
    });
  });
}

function renderSavedFilterTabs() {
  const container = document.getElementById('saved-filter-tabs');
  if (!container) return;
  const folders = getSavedFolderList();
  const tabs = [{ name: 'all', label: 'All' }, ...folders.map(f => ({ name: f.name, label: f.name }))];

  container.innerHTML = tabs.map(t => `
    <button type="button" data-folder="${escapeHTML(t.name)}" class="saved-tab-btn px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${savedFilters.folder === t.name ? 'bg-brand-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'}">${escapeHTML(t.label)}</button>
  `).join('');

  container.querySelectorAll('.saved-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      savedFilters.folder = btn.dataset.folder;
      savedCurrentPage = 1;
      renderSavedSection();
    });
  });
}

function attachSavedRowListeners() {
  document.querySelectorAll('.saved-remove-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const row = e.currentTarget.closest('tr[data-id]');
      const id = row?.dataset.id;
      if (!id) return;
      btn.disabled = true;
      try {
        const item = allSavedResources.find(s => s.id === id);
        await deleteDoc(doc(db, "savedResources", id));
        allSavedResources = allSavedResources.filter(s => s.id !== id);
        if (item) savedMaterialIds.delete(item.materialId);
        renderSavedSection();
        renderStudySection();
      } catch (error) {
        console.error("Failed to remove saved resource:", error);
        alert("Couldn't remove this item. You may need to sign in again — try refreshing.");
        btn.disabled = false;
      }
    });
  });

  document.querySelectorAll('.saved-folder-select').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const row = e.currentTarget.closest('tr[data-id]');
      const id = row?.dataset.id;
      if (!id) return;
      const newFolder = sel.value;
      sel.disabled = true;
      try {
        await updateDoc(doc(db, "savedResources", id), { folder: newFolder });
        const item = allSavedResources.find(s => s.id === id);
        if (item) item.folder = newFolder;
        renderSavedSection();
      } catch (error) {
        console.error("Failed to move saved resource:", error);
        alert("Couldn't move this item to that collection — try refreshing.");
      } finally {
        sel.disabled = false;
      }
    });
  });
}

function renderSavedTable(filtered) {
  const tbody = document.getElementById('saved-items-tbody');
  const infoEl = document.getElementById('saved-pagination-info');
  const prevBtn = document.getElementById('saved-prev-btn');
  const nextBtn = document.getElementById('saved-next-btn');
  if (!tbody) return;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / SAVED_PAGE_SIZE));
  if (savedCurrentPage > totalPages) savedCurrentPage = totalPages;
  if (savedCurrentPage < 1) savedCurrentPage = 1;

  const start = (savedCurrentPage - 1) * SAVED_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + SAVED_PAGE_SIZE);
  const folderOptions = getSavedFolderList().map(f => f.name);

  if (total === 0) {
    const emptyMsg = savedFilters.folder !== 'all' || savedFilters.search
      ? 'No saved resources match this collection/search.'
      : 'Nothing saved yet — bookmark a resource from Study Materials to see it here.';
    tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-slate-400 dark:text-slate-500">${emptyMsg}</td></tr>`;
  } else {
    tbody.innerHTML = pageItems.map((data) => {
      const fileUrl = data.fileUrl || '#';
      const fi = iconForFile(fileUrl, data.type);
      const folder = data.folder || DEFAULT_SAVED_FOLDER;
      const dateSaved = (data.savedAt && typeof data.savedAt.toDate === 'function')
        ? data.savedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '—';
      return `
        <tr class="hover:bg-slate-50 dark:hover:bg-white/[0.05] group transition-colors" data-id="${escapeHTML(data.id)}">
          <td class="px-6 py-4 flex items-center gap-3">
            <i class="fas ${fi.icon} ${fi.color} text-xl"></i>
            <div>
              <a href="${escapeHTML(fileUrl)}" target="_blank" rel="noopener noreferrer" class="font-bold text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">${escapeHTML(data.name) || 'Untitled Document'}</a>
            </div>
          </td>
          <td class="px-6 py-4 text-slate-600 dark:text-slate-300">${escapeHTML(data.subject) || 'General'}</td>
          <td class="px-6 py-4 text-slate-600 dark:text-slate-300">${dateSaved}</td>
          <td class="px-6 py-4">
            <select class="saved-folder-select bg-slate-50 dark:bg-[#0f0a18]/50 border border-slate-200 dark:border-white/10 rounded-md text-xs px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer">
              ${folderOptions.map(name => `<option value="${escapeHTML(name)}" ${name === folder ? 'selected' : ''}>${escapeHTML(name)}</option>`).join('')}
            </select>
          </td>
          <td class="px-6 py-4 text-right">
            <div class="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <a href="${escapeHTML(fileUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-500/30 text-xs font-semibold transition-colors">
                <i class="fas fa-arrow-up-right-from-square"></i> Open
              </a>
              <button class="saved-remove-btn text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors" title="Remove from saved">
                <i class="fas fa-trash text-sm"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  if (infoEl) {
    infoEl.textContent = total === 0
      ? 'No entries'
      : `Showing ${start + 1} to ${Math.min(start + SAVED_PAGE_SIZE, total)} of ${total} entries`;
  }

  if (prevBtn) {
    prevBtn.disabled = savedCurrentPage <= 1;
    prevBtn.classList.toggle('cursor-not-allowed', prevBtn.disabled);
    prevBtn.classList.toggle('text-slate-400', prevBtn.disabled);
    prevBtn.classList.toggle('dark:text-slate-500', prevBtn.disabled);
    prevBtn.classList.toggle('hover:bg-slate-50', !prevBtn.disabled);
    prevBtn.classList.toggle('dark:hover:bg-white/5', !prevBtn.disabled);
    prevBtn.classList.toggle('text-slate-600', !prevBtn.disabled);
    prevBtn.classList.toggle('dark:text-slate-300', !prevBtn.disabled);
  }
  if (nextBtn) {
    nextBtn.disabled = savedCurrentPage >= totalPages;
    nextBtn.classList.toggle('cursor-not-allowed', nextBtn.disabled);
    nextBtn.classList.toggle('text-slate-400', nextBtn.disabled);
    nextBtn.classList.toggle('dark:text-slate-500', nextBtn.disabled);
    nextBtn.classList.toggle('hover:bg-slate-50', !nextBtn.disabled);
    nextBtn.classList.toggle('dark:hover:bg-white/5', !nextBtn.disabled);
    nextBtn.classList.toggle('text-slate-600', !nextBtn.disabled);
    nextBtn.classList.toggle('dark:text-slate-300', !nextBtn.disabled);
  }

  attachSavedRowListeners();
}

function renderSavedSection() {
  if (!document.getElementById('saved-items-tbody')) return;
  renderSavedFoldersGrid();
  renderSavedFilterTabs();
  const filtered = allSavedResources.filter(savedMatchesFilters);
  renderSavedTable(filtered);
}

async function loadSavedCollections() {
  if (!currentUser) return;
  try {
    const q = query(collection(db, "savedCollections"), where("uid", "==", currentUser.uid));
    const snap = await getDocs(q);
    savedCollections = [];
    snap.forEach(d => savedCollections.push({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Failed to load saved collections:", error);
  }
}

async function loadSavedResources() {
  if (!currentUser) return;
  const tbody = document.getElementById('saved-items-tbody');

  try {
    await loadSavedCollections();

    const q = query(
      collection(db, "savedResources"),
      where("uid", "==", currentUser.uid),
      orderBy("savedAt", "desc")
    );
    const snap = await getDocs(q);

    allSavedResources = [];
    savedMaterialIds = new Set();
    snap.forEach(d => {
      const data = { id: d.id, ...d.data() };
      allSavedResources.push(data);
      if (data.materialId) savedMaterialIds.add(data.materialId);
    });

    renderSavedSection();
    // The bookmark icon on the Study Materials table depends on
    // savedMaterialIds, so refresh it now that we know what's saved.
    renderStudySection();
  } catch (error) {
    console.error("Error loading saved resources:", error);
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-rose-500">Failed to load saved resources.</td></tr>`;
  }
}

const savedSearchInput = document.getElementById('saved-search');
const savedPrevBtn = document.getElementById('saved-prev-btn');
const savedNextBtn = document.getElementById('saved-next-btn');
const savedNewFolderBtn = document.getElementById('saved-new-folder-btn');

if (savedSearchInput) {
  savedSearchInput.addEventListener('input', () => {
    savedFilters.search = savedSearchInput.value.trim();
    savedCurrentPage = 1;
    renderSavedSection();
  });
}
if (savedPrevBtn) savedPrevBtn.addEventListener('click', () => { savedCurrentPage--; renderSavedSection(); });
if (savedNextBtn) savedNextBtn.addEventListener('click', () => { savedCurrentPage++; renderSavedSection(); });

if (savedNewFolderBtn) {
  savedNewFolderBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    const name = prompt('Name your new collection:');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();

    if (getSavedFolderList().some(f => f.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('A collection with that name already exists.');
      return;
    }

    savedNewFolderBtn.disabled = true;
    try {
      const ref = await addDoc(collection(db, "savedCollections"), {
        uid: currentUser.uid,
        name: trimmed,
        createdAt: Timestamp.now()
      });
      savedCollections.push({ id: ref.id, name: trimmed });
      renderSavedSection();
    } catch (error) {
      console.error("Failed to create collection:", error);
      alert("Couldn't create the collection — try refreshing.");
    } finally {
      savedNewFolderBtn.disabled = false;
    }
  });
}

// ==========================================
// 6c. MY UPLOADS (Personal) — the signed-in user's own submissions,
// across every status, with real moderation state (who verified it,
// and why it was rejected if it was).
// ==========================================
let myUploadsAll = [];
const myUploadsFilters = { status: 'all', search: '' };
let myUploadsCurrentPage = 1;
const MYUPLOADS_PAGE_SIZE = 6;

async function loadMyUploads() {
  const tbody = document.getElementById('myuploads-tbody');
  if (!tbody || !currentUser) return;

  tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-slate-400 dark:text-slate-500"><i class="fas fa-spinner fa-spin mr-2"></i> Loading your uploads...</td></tr>`;

  try {
    // Deliberately no orderBy here — combining it with the where() below
    // would require a composite Firestore index to be created manually in
    // the console. Sorting client-side (below) avoids that setup step
    // entirely, and this collection is small per-user so it's cheap.
    const q = query(
      collection(db, "studyMaterials"),
      where("uploaderUid", "==", currentUser.uid)
    );
    const snapshot = await getDocs(q);

    myUploadsAll = [];
    snapshot.forEach((docSnap) => {
      myUploadsAll.push({ id: docSnap.id, ...docSnap.data() });
    });
    myUploadsAll.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    myUploadsCurrentPage = 1;
    renderMyUploadsStats();
    renderMyUploadsSection();

  } catch (error) {
    console.error("Error loading my uploads:", error);
    tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-rose-500">Failed to load your uploads.</td></tr>`;
  }
}

// Contributor Points are derived straight from approved-upload count (15 pts
// each, matching the notice shown on the Contribute Material page) so the
// number shown can never drift out of sync with what actually got approved.
function renderMyUploadsStats() {
  const total = myUploadsAll.length;
  const approved = myUploadsAll.filter(m => m.status === 'approved').length;
  const pending = myUploadsAll.filter(m => m.status === 'pending').length;
  const points = approved * 15;

  const totalEl = document.getElementById('myuploads-total');
  const approvedEl = document.getElementById('myuploads-approved');
  const pendingEl = document.getElementById('myuploads-pending');
  const pointsEl = document.getElementById('myuploads-points');
  const headerPointsEl = document.getElementById('header-contributor-points');

  if (totalEl) totalEl.textContent = total;
  if (approvedEl) approvedEl.textContent = approved;
  if (pendingEl) pendingEl.textContent = pending;
  if (pointsEl) pointsEl.textContent = points;
  if (headerPointsEl) headerPointsEl.textContent = `${points} Pts`;
}

function myUploadMatchesFilters(m) {
  if (myUploadsFilters.status !== 'all' && m.status !== myUploadsFilters.status) return false;
  if (myUploadsFilters.search) {
    const needle = myUploadsFilters.search.toLowerCase();
    const haystack = `${m.name || ''} ${m.subject || ''} ${m.type || ''}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

// Renders the Status cell. Approved/Rejected rows show a second, muted line
// naming which admin reviewed it (and why, for rejections) — this is the
// "which admin verified this" info a normal user should be able to see for
// their own submissions.
function renderMyUploadStatusBadge(data) {
  if (data.status === 'approved') {
    const verifier = data.reviewedBy
      ? `<span class="text-[10px] text-slate-500 dark:text-slate-400">Verified by ${escapeHTML(data.reviewedBy)}</span>`
      : '';
    return `<div class="flex flex-col gap-1 items-start"><span class="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium px-2.5 py-1 rounded-md text-xs border border-emerald-200 dark:border-emerald-500/30"><i class="fas fa-check-circle text-[10px]"></i> Approved</span>${verifier}</div>`;
  }
  if (data.status === 'rejected') {
    const parts = [];
    if (data.rejectionReason) parts.push(`Reason: ${escapeHTML(data.rejectionReason)}`);
    if (data.reviewedBy) parts.push(`by ${escapeHTML(data.reviewedBy)}`);
    const detail = parts.length ? `<span class="text-[10px] text-slate-500 dark:text-slate-400">${parts.join(' — ')}</span>` : '';
    return `<div class="flex flex-col gap-1 items-start"><span class="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-medium px-2.5 py-1 rounded-md text-xs border border-rose-200 dark:border-rose-500/30"><i class="fas fa-times-circle text-[10px]"></i> Rejected</span>${detail}</div>`;
  }
  return `<span class="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium px-2.5 py-1 rounded-md text-xs border border-amber-200 dark:border-amber-500/30"><i class="fas fa-circle-notch fa-spin text-[10px]"></i> Pending Review</span>`;
}

function renderMyUploadRow(data) {
  const fileUrl = data.fileUrl || '#';
  const fi = iconForFile(fileUrl, data.type);
  return `
    <tr class="hover:bg-slate-50 dark:hover:bg-white/5 group transition-colors" data-id="${escapeHTML(data.id)}">
      <td class="px-6 py-4 flex items-center gap-3">
        <i class="fas ${fi.icon} ${fi.color} text-xl"></i>
        <div>
          <a href="${escapeHTML(fileUrl)}" target="_blank" rel="noopener noreferrer" class="font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 cursor-pointer">${escapeHTML(data.name) || 'Untitled Document'}</a>
          <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">${escapeHTML(data.semester) || '—'}</p>
        </div>
      </td>
      <td class="px-6 py-4">${escapeHTML(data.subject) || 'General'}</td>
      <td class="px-6 py-4">${renderMyUploadStatusBadge(data)}</td>
      <td class="px-6 py-4">${escapeHTML(data.date) || '—'}</td>
      <td class="px-6 py-4 text-right">
        <div class="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <a href="${escapeHTML(fileUrl)}" target="_blank" rel="noopener noreferrer" class="text-slate-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors" title="Open file"><i class="fas fa-external-link-alt text-sm"></i></a>
          <button class="myupload-delete-btn text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors" title="Delete submission"><i class="fas fa-trash text-sm"></i></button>
        </div>
      </td>
    </tr>
  `;
}

function attachMyUploadRowListeners() {
  document.querySelectorAll('.myupload-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const row = e.currentTarget.closest('tr[data-id]');
      const id = row?.dataset.id;
      if (!id) return;
      if (!confirm('Delete this upload? This cannot be undone.')) return;

      btn.disabled = true;
      try {
        // Firestore Rules should restrict this delete to the doc's own
        // uploaderUid — this call fails safely for anyone else's uploads.
        await deleteDoc(doc(db, "studyMaterials", id));
        myUploadsAll = myUploadsAll.filter(m => m.id !== id);
        renderMyUploadsStats();
        renderMyUploadsSection();
      } catch (error) {
        console.error("Failed to delete upload:", error);
        alert("Couldn't delete this upload. You may not have permission, or your session expired — try refreshing.");
        btn.disabled = false;
      }
    });
  });
}

function renderMyUploadsTable(filtered) {
  const tbody = document.getElementById('myuploads-tbody');
  const infoEl = document.getElementById('myuploads-pagination-info');
  const prevBtn = document.getElementById('myuploads-prev-btn');
  const nextBtn = document.getElementById('myuploads-next-btn');
  if (!tbody) return;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / MYUPLOADS_PAGE_SIZE));
  if (myUploadsCurrentPage > totalPages) myUploadsCurrentPage = totalPages;
  if (myUploadsCurrentPage < 1) myUploadsCurrentPage = 1;

  const start = (myUploadsCurrentPage - 1) * MYUPLOADS_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + MYUPLOADS_PAGE_SIZE);

  if (total === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-slate-400 dark:text-slate-500">No uploads match this filter yet.</td></tr>`;
  } else {
    tbody.innerHTML = pageItems.map(renderMyUploadRow).join('');
    attachMyUploadRowListeners();
  }

  if (infoEl) {
    infoEl.textContent = total === 0
      ? 'No entries'
      : `Showing ${start + 1} to ${Math.min(start + MYUPLOADS_PAGE_SIZE, total)} of ${total} entries`;
  }

  if (prevBtn) {
    prevBtn.disabled = myUploadsCurrentPage <= 1;
    prevBtn.classList.toggle('cursor-not-allowed', prevBtn.disabled);
    prevBtn.classList.toggle('text-slate-400', prevBtn.disabled);
    prevBtn.classList.toggle('dark:text-slate-500', prevBtn.disabled);
    prevBtn.classList.toggle('hover:bg-slate-50', !prevBtn.disabled);
    prevBtn.classList.toggle('dark:hover:bg-white/5', !prevBtn.disabled);
    prevBtn.classList.toggle('text-slate-600', !prevBtn.disabled);
    prevBtn.classList.toggle('dark:text-slate-300', !prevBtn.disabled);
  }
  if (nextBtn) {
    nextBtn.disabled = myUploadsCurrentPage >= totalPages;
    nextBtn.classList.toggle('cursor-not-allowed', nextBtn.disabled);
    nextBtn.classList.toggle('text-slate-400', nextBtn.disabled);
    nextBtn.classList.toggle('dark:text-slate-500', nextBtn.disabled);
    nextBtn.classList.toggle('hover:bg-slate-50', !nextBtn.disabled);
    nextBtn.classList.toggle('dark:hover:bg-white/5', !nextBtn.disabled);
    nextBtn.classList.toggle('text-slate-600', !nextBtn.disabled);
    nextBtn.classList.toggle('dark:text-slate-300', !nextBtn.disabled);
  }
}

function renderMyUploadsSection() {
  const filtered = myUploadsAll.filter(myUploadMatchesFilters);
  renderMyUploadsTable(filtered);
}

// Wire up filter tabs, search box, pagination and the "Upload New Material"
// button — all present in the DOM from page load, even while this view is
// hidden behind the SPA router.
const myUploadsFilterBtns = document.querySelectorAll('.myuploads-filter-btn');
const myUploadsSearchInput = document.getElementById('myuploads-search');
const myUploadsPrevBtn = document.getElementById('myuploads-prev-btn');
const myUploadsNextBtn = document.getElementById('myuploads-next-btn');
const myUploadsNewBtn = document.getElementById('myuploads-new-btn');

function setActiveMyUploadsFilterStyle(activeBtn) {
  myUploadsFilterBtns.forEach(btn => {
    const isActive = btn === activeBtn;
    btn.classList.toggle('bg-slate-100', isActive);
    btn.classList.toggle('dark:bg-white/10', isActive);
    btn.classList.toggle('text-slate-800', isActive);
    btn.classList.toggle('dark:text-white', isActive);
    btn.classList.toggle('text-slate-500', !isActive);
    btn.classList.toggle('dark:text-slate-400', !isActive);
  });
}

myUploadsFilterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    myUploadsFilters.status = btn.dataset.status || 'all';
    myUploadsCurrentPage = 1;
    setActiveMyUploadsFilterStyle(btn);
    renderMyUploadsSection();
  });
});

if (myUploadsSearchInput) {
  myUploadsSearchInput.addEventListener('input', () => {
    myUploadsFilters.search = myUploadsSearchInput.value.trim();
    myUploadsCurrentPage = 1;
    renderMyUploadsSection();
  });
}
if (myUploadsPrevBtn) myUploadsPrevBtn.addEventListener('click', () => { myUploadsCurrentPage--; renderMyUploadsSection(); });
if (myUploadsNextBtn) myUploadsNextBtn.addEventListener('click', () => { myUploadsCurrentPage++; renderMyUploadsSection(); });
if (myUploadsNewBtn) myUploadsNewBtn.addEventListener('click', () => { window.location.href = 'contribute_material.html'; });

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
const categoryField = document.getElementById('admin-category-field');
const dateInput = document.getElementById('admin-date');
const locInput = document.getElementById('admin-location');
const categorySelect = document.getElementById('admin-category');

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
  categoryField.classList.add('hidden');
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
      categoryField.classList.remove('hidden');
      dateInput.required = true;
    } else {
      dateField.classList.add('hidden');
      locField.classList.add('hidden');
      categoryField.classList.add('hidden');
      dateInput.required = false;
    }
  });
}

// Lets the "Schedule Event" button on the Events Calendar page (admin-only,
// wired in calendar.js) reuse this same modal instead of duplicating it.
document.addEventListener('calendar:schedule-event', () => {
  openAdminModal();
  typeSelect.value = 'event';
  typeSelect.dispatchEvent(new Event('change'));
});

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
          category: categorySelect.value,
          date: Timestamp.fromDate(dateVal)
        });
      }

      adminFeedback.textContent = `Successfully added new ${type}!`;
      adminFeedback.className = "text-sm text-emerald-600 block";

      // Refresh the dashboard lists so the new item shows up immediately
      loadAnnouncements();
      loadUpcomingEventsList();
      if (type === 'event') refreshCommunityEvents();

      setTimeout(closeAdminModal, 900);

    } catch (error) {
      console.error("Error adding document:", error);
      adminFeedback.textContent = "Error: " + error.message;
      adminFeedback.className = "text-sm text-rose-500 block";
    }
  });
}

const CATEGORY_ICONS = {
  technical: 'fa-microchip',
  cultural: 'fa-masks-theater',
  social: 'fa-hand-holding-heart',
  magazines: 'fa-newspaper',
  branch: 'fa-sitemap',
  misc: 'fa-ellipsis'
};
 
function linkButton({ href, iconClass, activeClasses, label, disabledTitle }) {
  if (href) {
    return `
      <a href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer"
         class="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 ${activeClasses}"
         title="${escapeHTML(label)}" aria-label="${escapeHTML(label)}">
        <i class="${iconClass} text-sm"></i>
      </a>`;
  }
  return `
    <span class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 text-slate-300 dark:text-slate-600 cursor-not-allowed"
          title="${escapeHTML(disabledTitle)}" aria-disabled="true">
      <i class="${iconClass} text-sm"></i>
    </span>`;
}
 
function clubCard(club) {
  const insta = linkButton({
    href: club.instagram,
    iconClass: 'fab fa-instagram',
    activeClasses: 'bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600',
    label: `${club.name} on Instagram`,
    disabledTitle: 'Instagram not linked yet'
  });
  const whatsapp = linkButton({
    href: club.whatsapp,
    iconClass: 'fab fa-whatsapp',
    activeClasses: 'bg-emerald-500 hover:bg-emerald-600',
    label: `${club.name} WhatsApp channel`,
    disabledTitle: 'WhatsApp channel not linked yet'
  });

  const tooltip = (club.description && club.description.trim()) || 'No description yet';

  return `
    <div class="club-card group relative bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 flex items-center justify-between gap-3 hover:border-brand-300 dark:hover:border-white/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <span class="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">${escapeHTML(club.name)}</span>
      <div class="flex items-center gap-2 shrink-0">${insta}${whatsapp}</div>

      <div class="pointer-events-none absolute left-1/2 bottom-full -translate-x-1/2 mb-2 w-max max-w-[220px] px-3 py-2 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-xs leading-snug shadow-lg opacity-0 scale-95 origin-bottom group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-20">
        ${escapeHTML(tooltip)}
        <div class="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-900 dark:bg-slate-700"></div>
      </div>
    </div>`;
}
 
function categorySection(category) {
  const icon = CATEGORY_ICONS[category.id] || 'fa-users';
  const cardsHtml = category.clubs.map(clubCard).join('');
  return `
    <div class="club-category space-y-3" data-category="${category.id}">
      <h2 class="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
        <i class="fas ${icon} text-brand-500"></i> ${escapeHTML(category.label)}
        <span class="text-slate-300 dark:text-slate-600 font-normal normal-case">(${category.clubs.length})</span>
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">${cardsHtml}</div>
    </div>`;
}
 
function initClubsSection() {
  const container = document.getElementById('clubs-container');
  if (!container) return; // view-clubs markup not on this page
 
  const searchInput = document.getElementById('clubs-search');
  const emptyState = document.getElementById('clubs-empty');
  const filterBtns = document.querySelectorAll('.clubs-filter-btn');
 
  // Render once — filtering/searching after this just toggles visibility,
  // so we never re-build the DOM on every keystroke.
  container.innerHTML = CLUB_CATEGORIES.map(categorySection).join('');

    const totalClubs = CLUB_CATEGORIES.reduce((sum, cat) => sum + cat.clubs.length, 0);
    const totalCountEl = document.getElementById('clubs-total-count');
    if (totalCountEl) totalCountEl.textContent = `· ${totalClubs} clubs across ${CLUB_CATEGORIES.length} categories`;
 
  let activeCategory = 'all';
 
  function applyFilters() {
    const query = (searchInput?.value || '').trim().toLowerCase();
    let anyVisible = false;
 
    container.querySelectorAll('.club-category').forEach((section) => {
      const matchesCategory = activeCategory === 'all' || section.dataset.category === activeCategory;
      let categoryHasVisibleCard = false;
 
      section.querySelectorAll('.club-card').forEach((card) => {
        const name = card.querySelector('span').textContent.toLowerCase();
        const matchesSearch = !query || name.includes(query);
        const visible = matchesCategory && matchesSearch;
        card.classList.toggle('hidden', !visible);
        if (visible) categoryHasVisibleCard = true;
      });
 
      section.classList.toggle('hidden', !categoryHasVisibleCard);
      if (categoryHasVisibleCard) anyVisible = true;
    });
 
    if (emptyState) emptyState.classList.toggle('hidden', anyVisible);
  }
 
  if (searchInput) searchInput.addEventListener('input', applyFilters);
 
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.category;
      filterBtns.forEach((b) => {
        b.classList.toggle('bg-white', b === btn);
        b.classList.toggle('dark:bg-white/10', b === btn);
        b.classList.toggle('text-slate-800', b === btn);
        b.classList.toggle('dark:text-white', b === btn);
        b.classList.toggle('shadow-sm', b === btn);
        b.classList.toggle('text-slate-500', b !== btn);
        b.classList.toggle('dark:text-slate-400', b !== btn);
      });
      applyFilters();
    });
  });
 
  applyFilters();
}

initClubsSection();

// ==========================================
// CALENDAR PAGE MODULE (merged from calendar.js)
// Merges the static academic-calendar-data.js entries with the Firestore
// "events" collection, and drives the Events Calendar page: month grid,
// category filters, upcoming-agenda sidebar, event detail popup, and
// Google Calendar sync (.ics download + per-event deep links).
// ==========================================

// ==========================================
// STATE
// ==========================================
let communityEvents = [];      // normalized events loaded from Firestore "events" collection
let mergedEvents = [];         // ACADEMIC_CALENDAR + communityEvents, normalized, sorted
let activeCategories = new Set(CATEGORY_IDS); // all on by default
let viewDate = new Date();     // month currently shown (day is irrelevant, always render whole month)
let initialized = false;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ==========================================
// DOM ELEMENTS
// ==========================================
const els = {};
function cacheEls() {
  els.monthLabel = document.getElementById('calendar-month-label');
  els.gridDays = document.getElementById('calendar-grid-days');
  els.prevBtn = document.getElementById('calendar-prev-btn');
  els.nextBtn = document.getElementById('calendar-next-btn');
  els.todayBtn = document.getElementById('calendar-today-btn');
  els.filterBtn = document.getElementById('calendar-filter-btn');
  els.filterPanel = document.getElementById('calendar-filter-panel');
  els.filterOptions = document.getElementById('calendar-filter-options');
  els.filterClear = document.getElementById('calendar-filter-clear');
  els.agendaList = document.getElementById('calendar-agenda-list');
  els.legend = document.getElementById('calendar-legend');
  els.scheduleBtn = document.getElementById('calendar-schedule-btn');
  els.syncBtn = document.getElementById('calendar-sync-btn');

  els.eventModalBackdrop = document.getElementById('event-detail-modal-backdrop');
  els.eventModalClose = document.getElementById('event-detail-close');
  els.eventModalBadge = document.getElementById('event-detail-category-badge');
  els.eventModalTitle = document.getElementById('event-detail-title');
  els.eventModalDate = document.getElementById('event-detail-date');
  els.eventModalLocRow = document.getElementById('event-detail-location-row');
  els.eventModalLoc = document.getElementById('event-detail-location');
  els.eventModalDesc = document.getElementById('event-detail-description');
  els.eventModalGcalLink = document.getElementById('event-detail-gcal-link');

  els.gcalTutorialBackdrop = document.getElementById('gcal-tutorial-modal-backdrop');
  els.gcalTutorialClose = document.getElementById('gcal-tutorial-close');
  els.gcalTutorialCancel = document.getElementById('gcal-tutorial-cancel');
  els.gcalTutorialDownload = document.getElementById('gcal-tutorial-download');
  els.gcalTutorialDontShow = document.getElementById('gcal-tutorial-dont-show');
}

// ==========================================
// DATE HELPERS (local-time, string-based to avoid TZ off-by-one bugs)
// ==========================================
function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ==========================================
// DATA LOADING
// ==========================================
async function fetchCommunityEvents() {
  try {
    const snap = await getDocs(query(collection(db, "events"), orderBy("date", "asc")));
    communityEvents = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.date || !data.date.toDate) return;
      const start = startOfDay(data.date.toDate());
      communityEvents.push({
        id: docSnap.id,
        title: data.title || 'Untitled Event',
        description: data.description || '',
        location: data.location || '',
        category: CATEGORY_META[data.category] ? data.category : 'workshop', // legacy docs without a category fall back sensibly
        startDate: start,
        endDate: start,
        source: 'community'
      });
    });
  } catch (error) {
    console.error("Error loading community events for calendar:", error);
    communityEvents = [];
  }
}

function buildMergedEvents() {
  const official = ACADEMIC_CALENDAR.map(ev => ({
    id: ev.id,
    title: ev.title,
    description: ev.description || '',
    location: '',
    category: ev.category,
    startDate: parseISODate(ev.startDate),
    endDate: parseISODate(ev.endDate),
    source: 'official'
  }));
  mergedEvents = [...official, ...communityEvents].sort((a, b) => a.startDate - b.startDate);
}

// ==========================================
// RENDER: LEGEND + FILTER PANEL
// ==========================================
function renderLegend() {
  els.legend.innerHTML = CATEGORY_IDS.map(id => {
    const meta = CATEGORY_META[id];
    return `<span class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"><div class="w-2 h-2 rounded-full ${meta.dot}"></div> ${escapeHTML(meta.label)}</span>`;
  }).join('');
}

function renderFilterPanel() {
  els.filterOptions.innerHTML = CATEGORY_IDS.map(id => {
    const meta = CATEGORY_META[id];
    const checked = activeCategories.has(id) ? 'checked' : '';
    return `
      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 rounded px-1.5 py-1">
        <input type="checkbox" data-category="${id}" ${checked} class="rounded border-slate-300 dark:border-white/20 text-brand-600 focus:ring-brand-500">
        <div class="w-2 h-2 rounded-full ${meta.dot}"></div>
        ${escapeHTML(meta.label)}
      </label>`;
  }).join('');

  els.filterOptions.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const cat = e.target.getAttribute('data-category');
      if (e.target.checked) activeCategories.add(cat); else activeCategories.delete(cat);
      renderGrid();
      renderAgenda();
    });
  });
}

function updateFilterClearLabel() {
  els.filterClear.textContent = activeCategories.size === CATEGORY_IDS.length ? 'Clear all' : 'Select all';
}

// ==========================================
// RENDER: MONTH GRID
// ==========================================
function eventsForDay(day) {
  return mergedEvents.filter(ev => activeCategories.has(ev.category) && ev.startDate <= day && ev.endDate >= day);
}

function dayCellHTML(date, inCurrentMonth, isToday) {
  const dayEvents = eventsForDay(date).slice(0, 3);
  const overflow = eventsForDay(date).length - dayEvents.length;

  const baseClasses = inCurrentMonth
    ? 'bg-white dark:bg-[#0f0a18]/60 hover:bg-slate-50 dark:hover:bg-white/5'
    : 'bg-slate-50 dark:bg-black/20';

  const chips = dayEvents.map(ev => {
    const meta = CATEGORY_META[ev.category];
    return `<div data-event-id="${escapeHTML(ev.id)}" data-event-source="${ev.source}" class="calendar-event-chip cursor-pointer ${meta.chipBg} border ${meta.chipBorder} ${meta.chipText} text-[10px] font-semibold px-1.5 py-1 rounded mb-1 truncate"><i class="fas ${meta.icon} mr-1"></i>${escapeHTML(ev.title)}</div>`;
  }).join('');

  const overflowHTML = overflow > 0
    ? `<div class="text-[10px] font-medium text-slate-400 dark:text-slate-500 px-1">+${overflow} more</div>`
    : '';

  if (isToday) {
    return `<div class="bg-brand-50/30 dark:bg-brand-900/20 p-2 flex flex-col hover:bg-brand-50/50 dark:hover:bg-brand-900/30 relative border-2 border-brand-500 dark:border-brand-500/50 shadow-inner">
      <div class="flex justify-end mb-1"><span class="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold">${date.getDate()}</span></div>
      ${chips}${overflowHTML}
    </div>`;
  }

  return `<div class="${baseClasses} p-2 flex flex-col">
    <span class="text-xs font-medium ${inCurrentMonth ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600'} text-right">${date.getDate()}</span>
    ${chips}${overflowHTML}
  </div>`;
}

function renderGrid() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  els.monthLabel.textContent = `${MONTH_NAMES[month]} ${year}`;

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const leadingDays = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = addDays(firstOfMonth, -leadingDays);
  const totalCells = Math.ceil((leadingDays + lastOfMonth.getDate()) / 7) * 7;

  const today = startOfDay(new Date());
  let html = '';
  for (let i = 0; i < totalCells; i++) {
    const cellDate = addDays(gridStart, i);
    const inCurrentMonth = cellDate.getMonth() === month;
    const isToday = isSameDay(cellDate, today);
    html += dayCellHTML(cellDate, inCurrentMonth, isToday);
  }
  els.gridDays.innerHTML = html;

  els.gridDays.querySelectorAll('.calendar-event-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.getAttribute('data-event-id');
      const source = chip.getAttribute('data-event-source');
      const ev = mergedEvents.find(e => e.id === id && e.source === source);
      if (ev) openEventDetail(ev);
    });
  });
}

// ==========================================
// RENDER: UPCOMING AGENDA (next 7 days)
// ==========================================
const AGENDA_BORDER_COLORS = {
  academic: 'border-brand-500', workshop: 'border-emerald-500', club: 'border-purple-500',
  deadline: 'border-amber-500', exams: 'border-rose-500', holiday: 'border-teal-500'
};

function renderAgenda() {
  const today = startOfDay(new Date());
  const weekOut = addDays(today, 7);

  const upcoming = mergedEvents
    .filter(ev => activeCategories.has(ev.category) && ev.endDate >= today && ev.startDate <= weekOut)
    .sort((a, b) => a.startDate - b.startDate)
    .slice(0, 6);

  if (upcoming.length === 0) {
    els.agendaList.innerHTML = `<p class="text-sm text-slate-400 dark:text-slate-500">Nothing in the next 7 days.</p>`;
    return;
  }

  els.agendaList.innerHTML = upcoming.map(ev => {
    const border = AGENDA_BORDER_COLORS[ev.category] || 'border-slate-400';
    const dateLabel = isSameDay(ev.startDate, ev.endDate)
      ? ev.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : `${ev.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${ev.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    return `
      <div class="relative pl-4 border-l-2 ${border} calendar-agenda-item cursor-pointer" data-event-id="${escapeHTML(ev.id)}" data-event-source="${ev.source}">
        <div class="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-white dark:bg-[#0f0a18] border-2 ${border}"></div>
        <p class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">${escapeHTML(dateLabel)}</p>
        <h3 class="font-bold text-slate-900 dark:text-white">${escapeHTML(ev.title)}</h3>
        ${ev.location ? `<p class="text-sm text-slate-500 dark:text-slate-400 mt-1">${escapeHTML(ev.location)}</p>` : ''}
      </div>`;
  }).join('');

  els.agendaList.querySelectorAll('.calendar-agenda-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-event-id');
      const source = item.getAttribute('data-event-source');
      const ev = mergedEvents.find(e => e.id === id && e.source === source);
      if (ev) openEventDetail(ev);
    });
  });
}

// ==========================================
// EVENT DETAIL MODAL
// ==========================================
let currentDetailEvent = null;

function openEventDetail(ev) {
  currentDetailEvent = ev;
  const meta = CATEGORY_META[ev.category];

  els.eventModalBadge.className = `inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md border mb-2 ${meta.chipBg} ${meta.chipBorder} ${meta.chipText}`;
  els.eventModalBadge.innerHTML = `<i class="fas ${meta.icon}"></i> ${escapeHTML(meta.label)}`;
  els.eventModalTitle.textContent = ev.title;

  const dateLabel = isSameDay(ev.startDate, ev.endDate)
    ? ev.startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : `${ev.startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${ev.endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  els.eventModalDate.textContent = dateLabel;

  if (ev.location) {
    els.eventModalLocRow.classList.remove('hidden');
    els.eventModalLoc.textContent = ev.location;
  } else {
    els.eventModalLocRow.classList.add('hidden');
  }

  els.eventModalDesc.textContent = ev.description || 'No further details provided.';
  els.eventModalGcalLink.href = buildGoogleCalendarLink(ev);

  els.eventModalBackdrop.classList.remove('hidden');
  els.eventModalBackdrop.classList.add('flex');
}

function closeEventDetail() {
  els.eventModalBackdrop.classList.add('hidden');
  els.eventModalBackdrop.classList.remove('flex');
  currentDetailEvent = null;
}

// ==========================================
// GOOGLE CALENDAR SYNC (.ics download + per-event deep link)
// ==========================================
function icsDateValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function buildGoogleCalendarLink(ev) {
  const start = icsDateValue(ev.startDate);
  const end = icsDateValue(addDays(ev.endDate, 1)); // Google's end date is exclusive
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${start}/${end}`,
    details: ev.description || '',
    location: ev.location || ''
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeICSText(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function buildICSFile(events) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CivHub//Events Calendar//EN', 'CALSCALE:GREGORIAN'];
  events.forEach(ev => {
    const uid = `${ev.source}-${ev.id}@civhub`;
    const dtStart = icsDateValue(ev.startDate);
    const dtEnd = icsDateValue(addDays(ev.endDate, 1)); // exclusive end per RFC 5545
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${icsDateValue(new Date())}T000000Z`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${escapeICSText(ev.title)}`,
      `DESCRIPTION:${escapeICSText(ev.description)}`,
      `LOCATION:${escapeICSText(ev.location)}`,
      'END:VEVENT'
    );
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadFilteredICS() {
  const visible = mergedEvents.filter(ev => activeCategories.has(ev.category));
  const icsContent = buildICSFile(visible);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'civhub-events.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const GCAL_TUTORIAL_DISMISSED_KEY = 'civhub_gcal_tutorial_dismissed';

function openGcalTutorial() {
  if (localStorage.getItem(GCAL_TUTORIAL_DISMISSED_KEY) === 'true') {
    downloadFilteredICS();
    return;
  }
  els.gcalTutorialBackdrop.classList.remove('hidden');
  els.gcalTutorialBackdrop.classList.add('flex');
}

function closeGcalTutorial() {
  els.gcalTutorialBackdrop.classList.add('hidden');
  els.gcalTutorialBackdrop.classList.remove('flex');
}

// ==========================================
// WIRE UP EVENTS (once)
// ==========================================
function wireStaticListeners() {
  els.prevBtn.addEventListener('click', () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    renderGrid();
  });
  els.nextBtn.addEventListener('click', () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    renderGrid();
  });
  els.todayBtn.addEventListener('click', () => {
    viewDate = new Date();
    renderGrid();
  });

  els.filterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    els.filterPanel.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!els.filterPanel.classList.contains('hidden') && !els.filterPanel.contains(e.target) && e.target !== els.filterBtn) {
      els.filterPanel.classList.add('hidden');
    }
  });
  els.filterClear.addEventListener('click', () => {
    if (activeCategories.size === CATEGORY_IDS.length) {
      activeCategories = new Set();
    } else {
      activeCategories = new Set(CATEGORY_IDS);
    }
    renderFilterPanel();
    updateFilterClearLabel();
    renderGrid();
    renderAgenda();
  });

  els.eventModalClose.addEventListener('click', closeEventDetail);
  els.eventModalBackdrop.addEventListener('click', (e) => { if (e.target === els.eventModalBackdrop) closeEventDetail(); });

  els.syncBtn.addEventListener('click', openGcalTutorial);
  els.gcalTutorialClose.addEventListener('click', closeGcalTutorial);
  els.gcalTutorialCancel.addEventListener('click', closeGcalTutorial);
  els.gcalTutorialBackdrop.addEventListener('click', (e) => { if (e.target === els.gcalTutorialBackdrop) closeGcalTutorial(); });
  els.gcalTutorialDownload.addEventListener('click', () => {
    if (els.gcalTutorialDontShow.checked) {
      localStorage.setItem(GCAL_TUTORIAL_DISMISSED_KEY, 'true');
    }
    downloadFilteredICS();
    closeGcalTutorial();
  });

  els.scheduleBtn.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('calendar:schedule-event'));
  });
}

// ==========================================
// PUBLIC API
// ==========================================
async function initCalendarPage() {
  cacheEls();
  if (!els.gridDays) return; // calendar view not present on this page

  if (!initialized) {
    wireStaticListeners();
    renderFilterPanel();
    updateFilterClearLabel();
    renderLegend();
    initialized = true;
  }

  await fetchCommunityEvents();
  buildMergedEvents();
  renderGrid();
  renderAgenda();
}

async function refreshCommunityEvents() {
  if (!initialized) return;
  await fetchCommunityEvents();
  buildMergedEvents();
  renderGrid();
  renderAgenda();
}

function setCalendarAdmin(isAdmin) {
  if (!els.scheduleBtn) cacheEls();
  if (!els.scheduleBtn) return;
  if (isAdmin) {
    els.scheduleBtn.classList.remove('hidden');
    els.scheduleBtn.classList.add('flex');
  } else {
    els.scheduleBtn.classList.add('hidden');
    els.scheduleBtn.classList.remove('flex');
  }
}

// ==========================================
// 10. TIME TABLE
// Reads the static weekly schedule from timetable-data.js and drives the
// Time Table page: batch selector, weekly grid, session-type filters,
// today's-classes sidebar, class detail popup, and Google Calendar sync
// (.ics download + per-class deep links) — mirroring the Events Calendar
// module above, but for a recurring weekly schedule instead of dated events.
// ==========================================

// ==========================================
// TIMETABLE VALIDITY WINDOW — EDIT THIS EACH TIME THE TIMETABLE CHANGES
//
// TIMETABLE_ENTRIES (in timetable-data.js) only reflects ONE version of the
// schedule at a time. The portal reshuffles rooms/slots after Mid-Term
// Exams, so the version currently entered there is not valid for the whole
// semester — it needs an explicit "this is only good until ___" date, or
// the weekly Google Calendar sync will happily keep recurring stale classes
// forever (previously it recurred until "Last Date of Teaching", which is
// wrong for a timetable that's only accurate up to Mid-Terms).
//
// TIMETABLE_VALID_FROM / TIMETABLE_VALID_UNTIL below are the ONLY two values
// you should need to touch when:
//   - a new timetable is published (update both dates + timetable-data.js)
//   - the current one stops being accurate (update TIMETABLE_VALID_UNTIL)
//
// Format: 'YYYY-MM-DD', inclusive on both ends. Leave TIMETABLE_VALID_UNTIL
// as null to fall back to the semester's official Last Date of Teaching
// (from academic-calendar-data.js) — i.e. "valid for the whole semester".
// ==========================================
const TIMETABLE_VALID_FROM = '2026-07-16';   // Commencement of Classes
const TIMETABLE_VALID_UNTIL = '2026-09-09';  // <-- set this to the last day THIS timetable is accurate for (currently: day before Mid-Term Examinations begin)

// ==========================================
// STATE
// ==========================================
let ttSelectedBatch = TIMETABLE_BATCHES[0];
let ttActiveTypes = new Set(Object.keys(TIMETABLE_TYPE_META)); // all on by default
let ttInitialized = false;
let ttCurrentDetailEntry = null;

const TT_WEEKDAY_INDEX = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

// ==========================================
// DOM ELEMENTS
// ==========================================
const ttEls = {};
function ttCacheEls() {
  ttEls.batchSelect = document.getElementById('timetable-batch-select');
  ttEls.filterBtn = document.getElementById('timetable-filter-btn');
  ttEls.filterPanel = document.getElementById('timetable-filter-panel');
  ttEls.filterOptions = document.getElementById('timetable-filter-options');
  ttEls.filterClear = document.getElementById('timetable-filter-clear');
  ttEls.grid = document.getElementById('timetable-grid');
  ttEls.todayLabel = document.getElementById('timetable-today-label');
  ttEls.todayList = document.getElementById('timetable-today-list');
  ttEls.legend = document.getElementById('timetable-legend');
  ttEls.syncBtn = document.getElementById('timetable-sync-btn');

  ttEls.modalBackdrop = document.getElementById('class-detail-modal-backdrop');
  ttEls.modalClose = document.getElementById('class-detail-close');
  ttEls.modalBadge = document.getElementById('class-detail-type-badge');
  ttEls.modalTitle = document.getElementById('class-detail-title');
  ttEls.modalTime = document.getElementById('class-detail-time');
  ttEls.modalLocRow = document.getElementById('class-detail-location-row');
  ttEls.modalLoc = document.getElementById('class-detail-location');
  ttEls.modalBatchRow = document.getElementById('class-detail-batch-row');
  ttEls.modalBatch = document.getElementById('class-detail-batch');
  ttEls.modalFaculty = document.getElementById('class-detail-faculty');
  ttEls.modalGcalLink = document.getElementById('class-detail-gcal-link');

  ttEls.tutorialBackdrop = document.getElementById('timetable-gcal-tutorial-modal-backdrop');
  ttEls.tutorialClose = document.getElementById('timetable-gcal-tutorial-close');
  ttEls.tutorialCancel = document.getElementById('timetable-gcal-tutorial-cancel');
  ttEls.tutorialDownload = document.getElementById('timetable-gcal-tutorial-download');
  ttEls.tutorialDontShow = document.getElementById('timetable-gcal-tutorial-dont-show');
  ttEls.tutorialBatchName = document.getElementById('timetable-gcal-tutorial-batch');
}

// ==========================================
// VALIDITY WINDOW HELPERS — bound the weekly recurrence to
// TIMETABLE_VALID_FROM / TIMETABLE_VALID_UNTIL (defined above). Falls back
// to the semester's official Last Date of Teaching (from
// academic-calendar-data.js) only if TIMETABLE_VALID_UNTIL is left null.
// ==========================================
function ttValidFromDate() {
  return parseISODate(TIMETABLE_VALID_FROM);
}

function ttLastTeachingDate() {
  if (TIMETABLE_VALID_UNTIL) return parseISODate(TIMETABLE_VALID_UNTIL);

  const entry = ACADEMIC_CALENDAR.find(ev => ev.id === 'ac-last-teaching');
  if (entry) return parseISODate(entry.endDate);
  // Fallback in case that calendar entry is ever renamed/removed.
  return addDays(new Date(), 16 * 7);
}

// True once "today" is past the last day this timetable is valid for.
function ttIsPastValidityWindow() {
  return startOfDay(new Date()) > ttLastTeachingDate();
}

// ==========================================
// DATA HELPERS
// ==========================================
function ttEntriesFor(day, start, end) {
  return TIMETABLE_ENTRIES.filter(e =>
    e.day === day && e.start === start && e.end === end &&
    e.batches.includes(ttSelectedBatch) &&
    ttActiveTypes.has(e.type)
  );
}

function ttEntriesForBatch() {
  return TIMETABLE_ENTRIES.filter(e => e.batches.includes(ttSelectedBatch) && ttActiveTypes.has(e.type));
}

function ttFormatTime(t) {
  // "08:00" -> "8:00 AM", "14:00" -> "2:00 PM"
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// ==========================================
// RENDER: BATCH SELECT + LEGEND + FILTER PANEL
// ==========================================
function ttRenderBatchSelect() {
  ttEls.batchSelect.innerHTML = TIMETABLE_BATCHES.map(b =>
    `<option value="${escapeHTML(b)}" ${b === ttSelectedBatch ? 'selected' : ''}>${escapeHTML(b)}</option>`
  ).join('');
}

function ttRenderLegend() {
  ttEls.legend.innerHTML = Object.keys(TIMETABLE_TYPE_META).map(type => {
    const meta = TIMETABLE_TYPE_META[type];
    return `<span class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"><div class="w-2 h-2 rounded-full ${meta.dot}"></div> ${escapeHTML(meta.label)}</span>`;
  }).join('');
}

function ttRenderFilterPanel() {
  ttEls.filterOptions.innerHTML = Object.keys(TIMETABLE_TYPE_META).map(type => {
    const meta = TIMETABLE_TYPE_META[type];
    const checked = ttActiveTypes.has(type) ? 'checked' : '';
    return `
      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 rounded px-1.5 py-1">
        <input type="checkbox" data-type="${type}" ${checked} class="rounded border-slate-300 dark:border-white/20 text-brand-600 focus:ring-brand-500">
        <div class="w-2 h-2 rounded-full ${meta.dot}"></div>
        ${escapeHTML(meta.label)}
      </label>`;
  }).join('');

  ttEls.filterOptions.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const type = e.target.getAttribute('data-type');
      if (e.target.checked) ttActiveTypes.add(type); else ttActiveTypes.delete(type);
      ttUpdateFilterClearLabel();
      ttRenderGrid();
      ttRenderToday();
    });
  });
}

function ttUpdateFilterClearLabel() {
  const total = Object.keys(TIMETABLE_TYPE_META).length;
  ttEls.filterClear.textContent = ttActiveTypes.size === total ? 'Clear all' : 'Select all';
}

// ==========================================
// RENDER: WEEKLY GRID
// ==========================================
function ttEntryCardHTML(entry) {
  const meta = TIMETABLE_TYPE_META[entry.type] || TIMETABLE_TYPE_META.Lecture;
  return `
    <div data-day="${escapeHTML(entry.day)}" data-start="${escapeHTML(entry.start)}" data-end="${escapeHTML(entry.end)}" data-code="${escapeHTML(entry.code)}"
      class="timetable-entry-card cursor-pointer ${meta.chipBg} border ${meta.chipBorder} ${meta.chipText} text-xs rounded-lg px-2 py-1.5 mb-1 last:mb-0 hover:brightness-95 dark:hover:brightness-125 transition-all">
      <p class="font-bold truncate">${escapeHTML(entry.code)}</p>
      <p class="truncate opacity-80">${escapeHTML(meta.label)}${entry.room ? ' • ' + escapeHTML(entry.room) : ''}</p>
    </div>`;
}

function ttRenderGrid() {
  const dayHeaderCells = TIMETABLE_DAYS.map(d => `<div class="py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase border-r last:border-r-0 border-slate-200 dark:border-white/10">${d.slice(0, 3)}</div>`).join('');

  const rows = TIMETABLE_SLOTS.map(slot => {
    if (slot.isBreak) {
      return `
        <div class="grid border-b border-slate-200 dark:border-white/10 last:border-b-0" style="grid-template-columns: 90px repeat(5, 1fr);">
          <div class="px-2 py-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 border-r border-slate-200 dark:border-white/10 flex items-center">${ttFormatTime(slot.start)}</div>
          <div class="col-span-5 py-3 text-center text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/[0.02]"><i class="fas fa-utensils mr-1.5"></i>Lunch Break</div>
        </div>`;
    }
    const dayCells = TIMETABLE_DAYS.map(day => {
      const entries = ttEntriesFor(day, slot.start, slot.end);
      const content = entries.length ? entries.map(ttEntryCardHTML).join('') : '';
      return `<div class="px-1.5 py-1.5 border-r last:border-r-0 border-slate-100 dark:border-white/5 min-h-[68px]">${content}</div>`;
    }).join('');
    return `
      <div class="grid border-b border-slate-200 dark:border-white/10 last:border-b-0" style="grid-template-columns: 90px repeat(5, 1fr);">
        <div class="px-2 py-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-white/10 flex flex-col justify-center">
          <span>${ttFormatTime(slot.start)}</span>
          <span class="text-slate-300 dark:text-slate-600">${ttFormatTime(slot.end)}</span>
        </div>
        ${dayCells}
      </div>`;
  }).join('');

  ttEls.grid.innerHTML = `
    <div class="min-w-[640px]">
      <div class="grid bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10" style="grid-template-columns: 90px repeat(5, 1fr);">
        <div class="border-r border-slate-200 dark:border-white/10"></div>
        ${dayHeaderCells}
      </div>
      ${rows}
    </div>`;

  ttEls.grid.querySelectorAll('.timetable-entry-card').forEach(card => {
    card.addEventListener('click', () => {
      const { day, start, end, code } = card.dataset;
      const entry = TIMETABLE_ENTRIES.find(e =>
        e.day === day && e.start === start && e.end === end && e.code === code && e.batches.includes(ttSelectedBatch)
      );
      if (entry) ttOpenClassDetail(entry);
    });
  });
}

// ==========================================
// RENDER: TODAY'S CLASSES SIDEBAR
// ==========================================
function ttRenderToday() {
  const now = new Date();
  const todayName = Object.keys(TT_WEEKDAY_INDEX).find(k => TT_WEEKDAY_INDEX[k] === now.getDay());
  ttEls.todayLabel.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // This timetable version is no longer valid (see TIMETABLE_VALID_UNTIL) —
  // say so instead of silently showing a schedule that may no longer apply.
  if (ttIsPastValidityWindow()) {
    const untilLabel = ttLastTeachingDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    ttEls.todayList.innerHTML = `<p class="text-sm text-amber-600 dark:text-amber-400"><i class="fas fa-triangle-exclamation mr-1.5"></i>This timetable was only valid through ${untilLabel}. Check the portal for the current schedule.</p>`;
    return;
  }

  if (!TIMETABLE_DAYS.includes(todayName)) {
    ttEls.todayList.innerHTML = `<p class="text-sm text-slate-400 dark:text-slate-500">No classes today — enjoy the weekend!</p>`;
    return;
  }

  const todaysEntries = ttEntriesForBatch()
    .filter(e => e.day === todayName)
    .sort((a, b) => a.start.localeCompare(b.start));

  if (todaysEntries.length === 0) {
    ttEls.todayList.innerHTML = `<p class="text-sm text-slate-400 dark:text-slate-500">No classes match your filters today.</p>`;
    return;
  }

  ttEls.todayList.innerHTML = todaysEntries.map(entry => {
    const meta = TIMETABLE_TYPE_META[entry.type] || TIMETABLE_TYPE_META.Lecture;
    return `
      <div class="flex items-start gap-3">
        <div class="w-2 h-2 rounded-full ${meta.dot} mt-1.5 shrink-0"></div>
        <div>
          <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">${escapeHTML(entry.code)} <span class="font-normal text-slate-400 dark:text-slate-500">• ${escapeHTML(meta.label)}</span></p>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${ttFormatTime(entry.start)} – ${ttFormatTime(entry.end)}${entry.room ? ' • ' + escapeHTML(entry.room) : ''}</p>
        </div>
      </div>`;
  }).join('');
}

// ==========================================
// CLASS DETAIL MODAL
// ==========================================
function ttOpenClassDetail(entry) {
  ttCurrentDetailEntry = entry;
  const meta = TIMETABLE_TYPE_META[entry.type] || TIMETABLE_TYPE_META.Lecture;

  ttEls.modalBadge.className = `inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md border mb-2 ${meta.chipBg} ${meta.chipBorder} ${meta.chipText}`;
  ttEls.modalBadge.textContent = meta.label;
  ttEls.modalTitle.textContent = entry.code;
  ttEls.modalTime.textContent = `${entry.day}, ${ttFormatTime(entry.start)} – ${ttFormatTime(entry.end)} (weekly)`;

  if (entry.room) {
    ttEls.modalLocRow.classList.remove('hidden');
    ttEls.modalLoc.textContent = entry.room;
  } else {
    ttEls.modalLocRow.classList.add('hidden');
  }

  if (entry.batches.length > 1) {
    ttEls.modalBatchRow.classList.remove('hidden');
    ttEls.modalBatch.textContent = `Shared with ${entry.batches.join(', ')}${entry.batchLabel ? ' (' + entry.batchLabel + ')' : ''}`;
  } else {
    ttEls.modalBatchRow.classList.add('hidden');
  }

  ttEls.modalFaculty.textContent = entry.faculty ? `Faculty: ${entry.faculty}` : 'Faculty not listed.';
  ttEls.modalGcalLink.href = ttBuildGcalLink(entry);

  ttEls.modalBackdrop.classList.remove('hidden');
  ttEls.modalBackdrop.classList.add('flex');
}

function ttCloseClassDetail() {
  ttEls.modalBackdrop.classList.add('hidden');
  ttEls.modalBackdrop.classList.remove('flex');
  ttCurrentDetailEntry = null;
}

// ==========================================
// GOOGLE CALENDAR SYNC (recurring weekly, .ics download + per-class link)
// All wall-clock times below are treated as IST (UTC+5:30) regardless of the
// visitor's own system timezone, then converted to UTC for the ICS/URL —
// avoids relying on the browser's local timezone being correct.
// ==========================================
function ttNextDateForWeekday(dayName) {
  const target = TT_WEEKDAY_INDEX[dayName];
  const now = new Date();
  const diff = (target - now.getDay() + 7) % 7;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

function ttIstToUtc(year, month, day, hour, minute) {
  // IST is UTC+5:30, so UTC = IST wall-clock minus 5:30.
  return new Date(Date.UTC(year, month, day, hour - 5, minute - 30));
}

function ttIcsUtcValue(date) {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const mi = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${mo}${d}T${h}${mi}${s}Z`;
}

function ttEntryUtcRange(entry) {
  const { year, month, day } = ttNextDateForWeekday(entry.day);
  const [sh, sm] = entry.start.split(':').map(Number);
  const [eh, em] = entry.end.split(':').map(Number);
  return {
    start: ttIstToUtc(year, month, day, sh, sm),
    end: ttIstToUtc(year, month, day, eh, em)
  };
}

function ttRecurrenceUntilUtc() {
  const last = ttLastTeachingDate(); // local Date; only Y/M/D matter here
  return ttIstToUtc(last.getFullYear(), last.getMonth(), last.getDate(), 23, 59);
}

// ------------------------------------------
// MID-TERM EXAM WEEK EXCLUSION
// Regular classes don't run during Mid-Term Examinations, but a plain
// weekly RRULE has no idea that — it would still add a "class" on top of
// exam week, making the calendar look crowded/wrong right when it matters
// most. We pull the official MTE window from ACADEMIC_CALENDAR (single
// source of truth, shared with the Academic Calendar view) and EXDATE the
// one occurrence per entry that would otherwise land inside it.
//
// Note: the portal only publishes one timetable at a time, and the
// Post-MTE timetable is typically reshuffled (different rooms/slots) once
// it's released — TIMETABLE_ENTRIES here reflects whichever version is
// currently live. When the Post-MTE version is published, it should be
// modeled as its own entry set (e.g. TIMETABLE_ENTRIES_POST_MTE) so the
// sync can switch schedules at the MTE boundary instead of just skipping
// it. For now, skipping the exam week is the correct, honest behavior.
// ------------------------------------------
function ttMidtermWindow() {
  const entry = ACADEMIC_CALENDAR.find(ev => ev.id === 'ac-midterms');
  if (!entry) return null;
  return { start: parseISODate(entry.startDate), end: parseISODate(entry.endDate) };
}

// Returns the UTC instant of the single weekly occurrence (if any) of this
// timetable entry that falls inside the Mid-Term Exam window, or null.
function ttMidtermExdateUtc(entry) {
  const window = ttMidtermWindow();
  if (!window) return null;

  const [sh, sm] = entry.start.split(':').map(Number);
  for (let d = new Date(window.start); d <= window.end; d = addDays(d, 1)) {
    const dayName = Object.keys(TT_WEEKDAY_INDEX).find(k => TT_WEEKDAY_INDEX[k] === d.getDay());
    if (dayName === entry.day) {
      return ttIstToUtc(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm);
    }
  }
  return null;
}

function ttBuildGcalLink(entry) {
  const { start, end } = ttEntryUtcRange(entry);
  const until = ttRecurrenceUntilUtc();
  const details = [entry.faculty ? `Faculty: ${entry.faculty}` : '', entry.batchLabel ? `Group: ${entry.batchLabel}` : ''].filter(Boolean).join('\n');

  const recurLines = [`RRULE:FREQ=WEEKLY;UNTIL=${ttIcsUtcValue(until)}`];
  const mteExdate = ttMidtermExdateUtc(entry);
  if (mteExdate) recurLines.push(`EXDATE:${ttIcsUtcValue(mteExdate)}`);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${entry.code} (${entry.type})`,
    dates: `${ttIcsUtcValue(start)}/${ttIcsUtcValue(end)}`,
    details,
    location: entry.room || '',
    recur: recurLines.join('\n')
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function ttBuildICSFile(entries) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CivHub//Time Table//EN', 'CALSCALE:GREGORIAN'];
  const until = ttIcsUtcValue(ttRecurrenceUntilUtc());
  entries.forEach((entry, i) => {
    const { start, end } = ttEntryUtcRange(entry);
    const uid = `timetable-${ttSelectedBatch}-${entry.day}-${entry.start}-${i}@civhub`;
    const mteExdate = ttMidtermExdateUtc(entry);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${ttIcsUtcValue(new Date())}`,
      `DTSTART:${ttIcsUtcValue(start)}`,
      `DTEND:${ttIcsUtcValue(end)}`,
      `RRULE:FREQ=WEEKLY;UNTIL=${until}`
    );
    if (mteExdate) lines.push(`EXDATE:${ttIcsUtcValue(mteExdate)}`);
    lines.push(
      `SUMMARY:${escapeICSText(`${entry.code} (${entry.type})`)}`,
      `DESCRIPTION:${escapeICSText(entry.faculty ? `Faculty: ${entry.faculty}` : '')}`,
      `LOCATION:${escapeICSText(entry.room)}`,
      'END:VEVENT'
    );
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function ttDownloadFilteredICS() {
  const entries = ttEntriesForBatch();
  const icsContent = ttBuildICSFile(entries);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `civhub-timetable-${ttSelectedBatch}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const TT_GCAL_TUTORIAL_DISMISSED_KEY = 'civhub_timetable_gcal_tutorial_dismissed';

function ttOpenGcalTutorial() {
  ttEls.tutorialBatchName.textContent = ttSelectedBatch;
  if (localStorage.getItem(TT_GCAL_TUTORIAL_DISMISSED_KEY) === 'true') {
    ttDownloadFilteredICS();
    return;
  }
  ttEls.tutorialBackdrop.classList.remove('hidden');
  ttEls.tutorialBackdrop.classList.add('flex');
}

function ttCloseGcalTutorial() {
  ttEls.tutorialBackdrop.classList.add('hidden');
  ttEls.tutorialBackdrop.classList.remove('flex');
}

// ==========================================
// WIRE UP EVENTS (once)
// ==========================================
function ttWireStaticListeners() {
  ttEls.batchSelect.addEventListener('change', () => {
    ttSelectedBatch = ttEls.batchSelect.value;
    ttRenderGrid();
    ttRenderToday();
  });

  ttEls.filterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    ttEls.filterPanel.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!ttEls.filterPanel.classList.contains('hidden') && !ttEls.filterPanel.contains(e.target) && e.target !== ttEls.filterBtn) {
      ttEls.filterPanel.classList.add('hidden');
    }
  });
  ttEls.filterClear.addEventListener('click', () => {
    const total = Object.keys(TIMETABLE_TYPE_META).length;
    ttActiveTypes = ttActiveTypes.size === total ? new Set() : new Set(Object.keys(TIMETABLE_TYPE_META));
    ttRenderFilterPanel();
    ttUpdateFilterClearLabel();
    ttRenderGrid();
    ttRenderToday();
  });

  ttEls.modalClose.addEventListener('click', ttCloseClassDetail);
  ttEls.modalBackdrop.addEventListener('click', (e) => { if (e.target === ttEls.modalBackdrop) ttCloseClassDetail(); });

  ttEls.syncBtn.addEventListener('click', ttOpenGcalTutorial);
  ttEls.tutorialClose.addEventListener('click', ttCloseGcalTutorial);
  ttEls.tutorialCancel.addEventListener('click', ttCloseGcalTutorial);
  ttEls.tutorialBackdrop.addEventListener('click', (e) => { if (e.target === ttEls.tutorialBackdrop) ttCloseGcalTutorial(); });
  ttEls.tutorialDownload.addEventListener('click', () => {
    if (ttEls.tutorialDontShow.checked) {
      localStorage.setItem(TT_GCAL_TUTORIAL_DISMISSED_KEY, 'true');
    }
    ttDownloadFilteredICS();
    ttCloseGcalTutorial();
  });
}

// ==========================================
// PUBLIC API
// ==========================================
function initTimetablePage() {
  ttCacheEls();
  if (!ttEls.grid) return; // time table view not present on this page

  if (!ttInitialized) {
    ttWireStaticListeners();
    ttRenderBatchSelect();
    ttRenderFilterPanel();
    ttUpdateFilterClearLabel();
    ttRenderLegend();
    ttInitialized = true;
  }

  ttRenderGrid();
  ttRenderToday();
}