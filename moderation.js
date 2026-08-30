import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, query, where, orderBy, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-init.js';
import { initThemeToggle } from './theme-toggle.js';
import { escapeHTML } from './utils.js';
import { ALL_SEMESTERS, getSubjectsForSemester, populateSelect } from './curriculum-data.js';

initThemeToggle();

const TYPE_OPTIONS = [
  "Lecture Slides",
  "Reference Lecture Notes ",
  "Handwritten Notes (Teacher)",
  "Handwritten Notes (Student)",
  "Practicals",
  "Question Papers",
  "Question Paper Solutions",
  "Assignments",
  "Assignment Solutions",
  "Reference Books",
  "Tutorials",
  "Tutorial Solutions",
  "Miscellaneous"
];

const checkingAccessEl = document.getElementById('checking-access');
const accessDeniedEl = document.getElementById('access-denied');
const moderationContentEl = document.getElementById('moderation-content');
const queueListEl = document.getElementById('queue-list');
const emptyStateEl = document.getElementById('empty-state');

// Keep the last-loaded doc data around (keyed by id) so the edit form can be
// populated and re-rendered without a round trip to Firestore.
const pendingMaterials = new Map();

// The signed-in admin — recorded on every approve/reject so students can see
// which admin verified (or rejected) their submission.
let currentAdmin = null;

// ==========================================
// 1. ACCESS GATE
// ==========================================
// This check is for UX only — it hides/shows the UI.
// The real enforcement is the Firestore Rules (isAdmin()) on the
// `update`/`delete` calls below. Even if someone bypasses this check,
// Firestore itself will reject the write.
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentAdmin = user;

  try {
    const roleSnap = await getDoc(doc(db, "roles", user.uid));
    const isAdmin = roleSnap.exists() && roleSnap.data().role === "admin";

    if (!isAdmin) {
      showAccessDenied();
      return;
    }

    checkingAccessEl.classList.add('hidden');
    moderationContentEl.classList.remove('hidden');
    loadPendingMaterials();

  } catch (error) {
    console.error("Error checking admin role:", error);
    showAccessDenied();
  }
});

function showAccessDenied() {
  checkingAccessEl.classList.add('hidden');
  accessDeniedEl.classList.remove('hidden');
}

// ==========================================
// 2. LOAD PENDING SUBMISSIONS
// ==========================================
async function loadPendingMaterials() {
  queueListEl.innerHTML = `<div class="text-center py-12"><i class="fas fa-spinner fa-spin text-2xl text-brand-500"></i></div>`;
  pendingMaterials.clear();

  try {
    const q = query(
      collection(db, "studyMaterials"),
      where("status", "==", "pending"),
      orderBy("timestamp", "desc")
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      queueListEl.innerHTML = '';
      emptyStateEl.classList.remove('hidden');
      return;
    }

    emptyStateEl.classList.add('hidden');
    queueListEl.innerHTML = '';

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      pendingMaterials.set(docSnap.id, data);
      queueListEl.insertAdjacentHTML('beforeend', renderCard(docSnap.id, data));
    });

    attachCardListeners();

  } catch (error) {
    console.error("Error loading pending materials:", error);
    queueListEl.innerHTML = `<div class="text-center py-12 text-rose-500">Failed to load queue. Check the console for a Firestore index link if this is the first run.</div>`;
  }
}

// ==========================================
// 3. CARD RENDERING — view mode + edit mode
// ==========================================
// Turns a timestamp (ms) into "3 hours ago" / "2 days ago" / etc. Falls back
// to nothing if the timestamp is missing so the hover panel just omits it.
function formatRelativeTime(ms) {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const minute = 60 * 1000, hour = 60 * minute, day = 24 * hour;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fileExtensionBadge(fileUrl) {
  const match = (fileUrl || '').match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  return match ? match[1].toUpperCase() : 'FILE';
}

function renderCard(id, data) {
  return `
    <div class="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-6 transition-colors" data-id="${escapeHTML(id)}">
      ${renderViewMode(id, data)}
    </div>
  `;
}

function renderViewMode(id, data) {
  const fileUrl = escapeHTML(data.fileUrl || '#');
  const relativeTime = formatRelativeTime(data.timestamp);

  return `
    <div class="card-view flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="details-hover-anchor group relative flex items-start gap-4 min-w-0 cursor-help">
        <div class="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
          <i class="fas fa-file-lines"></i>
        </div>
        <div class="min-w-0">
          <span class="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
            ${escapeHTML(data.name) || 'Untitled Document'}
            <i class="fas fa-circle-info text-[11px] text-slate-300 dark:text-slate-600 group-hover:text-brand-400 transition-colors"></i>
          </span>
          <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span><i class="fas fa-book mr-1"></i>${escapeHTML(data.subject) || 'General'}</span>
            <span><i class="fas fa-layer-group mr-1"></i>${escapeHTML(data.semester) || '—'}</span>
            <span><i class="fas fa-tag mr-1"></i>${escapeHTML(data.type) || 'Resource'}</span>
            <span><i class="fas fa-clock mr-1"></i>${relativeTime || escapeHTML(data.date) || 'Recent'}</span>
          </div>
        </div>

        <!-- Hover detail panel -->
        <div class="hidden group-hover:block absolute left-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-30 p-4 text-left">
          <div class="flex items-center gap-3 pb-3 mb-3 border-b border-slate-100 dark:border-white/10">
            <div class="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 text-[10px] font-bold">
              ${escapeHTML(fileExtensionBadge(data.fileUrl))}
            </div>
            <p class="font-bold text-slate-900 dark:text-white text-sm leading-snug">${escapeHTML(data.name) || 'Untitled Document'}</p>
          </div>
          <dl class="space-y-2 text-xs">
            <div class="flex justify-between gap-3"><dt class="text-slate-400 dark:text-slate-500 shrink-0"><i class="fas fa-book w-4"></i> Subject</dt><dd class="text-slate-700 dark:text-slate-200 text-right truncate">${escapeHTML(data.subject) || 'General'}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-slate-400 dark:text-slate-500 shrink-0"><i class="fas fa-layer-group w-4"></i> Semester</dt><dd class="text-slate-700 dark:text-slate-200 text-right truncate">${escapeHTML(data.semester) || '—'}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-slate-400 dark:text-slate-500 shrink-0"><i class="fas fa-tag w-4"></i> Type</dt><dd class="text-slate-700 dark:text-slate-200 text-right truncate">${escapeHTML(data.type) || 'Resource'}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-slate-400 dark:text-slate-500 shrink-0"><i class="fas fa-user w-4"></i> Credit</dt><dd class="text-slate-700 dark:text-slate-200 text-right truncate">${escapeHTML(data.uploader) || 'Anonymous'}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-slate-400 dark:text-slate-500 shrink-0"><i class="fas fa-envelope w-4"></i> Account</dt><dd class="text-slate-700 dark:text-slate-200 text-right truncate">${escapeHTML(data.uploaderEmail) || 'Unknown'}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-slate-400 dark:text-slate-500 shrink-0"><i class="fas fa-calendar-day w-4"></i> Submitted</dt><dd class="text-slate-700 dark:text-slate-200 text-right truncate">${escapeHTML(data.date) || 'Recent'}${relativeTime ? ` · ${relativeTime}` : ''}</dd></div>
          </dl>
          <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="mt-3 flex items-center justify-center gap-2 w-full py-1.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-brand-600 dark:text-brand-400 font-medium rounded-lg text-xs transition-colors">
            <i class="fas fa-arrow-up-right-from-square"></i> Open File
          </a>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <button class="edit-btn px-3 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 font-medium rounded-lg text-sm transition-colors flex items-center gap-1.5">
          <i class="fas fa-pen"></i> Edit
        </button>
        <button class="reject-btn px-4 py-2 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-medium rounded-lg text-sm transition-colors flex items-center gap-1.5">
          <i class="fas fa-xmark"></i> Reject
        </button>
        <button class="approve-btn px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-1.5">
          <i class="fas fa-check"></i> Approve
        </button>
      </div>
    </div>
  `;
}

// Uploader-entered metadata is often wrong or missing, so this form lets an
// admin correct name/semester/subject/type/author before it goes live.
// Semester and Subject are still cascading selects here (same rule as the
// upload form), so an admin can't save a semester/subject combo that
// doesn't exist in the curriculum.
function renderEditMode(id, data) {
  return `
    <div class="card-edit space-y-4">
      <div>
        <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Document Title</label>
        <input type="text" class="edit-name w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" value="${escapeHTML(data.name || '')}">
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Semester</label>
          <select class="edit-semester w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"></select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Subject</label>
          <select class="edit-subject w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"></select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Resource Type</label>
          <select class="edit-type w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"></select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Author / Contributor</label>
          <input type="text" class="edit-author w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" value="${escapeHTML(data.uploader || '')}" placeholder="Anonymous">
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 pt-1">
        <button class="cancel-edit-btn px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 font-medium rounded-lg text-sm transition-colors">
          Cancel
        </button>
        <button class="save-edit-btn px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-1.5">
          <i class="fas fa-check"></i> Save Changes
        </button>
      </div>
    </div>
  `;
}

// Fills in the Semester/Subject/Type selects and wires the Semester -> Subject
// cascade for a freshly-inserted edit form.
function initEditFormControls(card, data) {
  const semesterSelect = card.querySelector('.edit-semester');
  const subjectSelect = card.querySelector('.edit-subject');
  const typeSelect = card.querySelector('.edit-type');

  populateSelect(semesterSelect, ALL_SEMESTERS, 'Select semester', data.semester || '');
  const subjectsForCurrentSemester = getSubjectsForSemester(data.semester || '');
  populateSelect(subjectSelect, subjectsForCurrentSemester, subjectsForCurrentSemester.length ? 'Select subject' : 'Select semester first', data.subject || '');
  subjectSelect.disabled = subjectsForCurrentSemester.length === 0;
  populateSelect(typeSelect, TYPE_OPTIONS, 'Select material type', data.type || '');

  semesterSelect.addEventListener('change', () => {
    const subjects = getSubjectsForSemester(semesterSelect.value);
    // Changing semester resets subject — an admin correcting a mismatched
    // pair shouldn't be able to leave a subject from the old semester in place.
    populateSelect(subjectSelect, subjects, subjects.length ? 'Select subject' : 'No subjects for this semester');
    subjectSelect.disabled = subjects.length === 0;
  });
}

// ==========================================
// 4. VIEW <-> EDIT MODE SWITCHING
// ==========================================
function attachCardListeners() {
  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', (e) => handleAction(e, 'approved'));
  });
  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', (e) => handleAction(e, 'rejected'));
  });
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => enterEditMode(e));
  });
}

function enterEditMode(e) {
  const card = e.target.closest('[data-id]');
  const id = card.dataset.id;
  const data = pendingMaterials.get(id) || {};

  card.innerHTML = renderEditMode(id, data);
  initEditFormControls(card, data);

  card.querySelector('.cancel-edit-btn').addEventListener('click', () => {
    card.innerHTML = renderViewMode(id, data);
    attachCardListenersFor(card);
  });

  card.querySelector('.save-edit-btn').addEventListener('click', () => saveEdit(card, id));
}

// Re-wires listeners for a single card (used after Cancel restores view mode,
// since innerHTML replacement drops the old listeners).
function attachCardListenersFor(card) {
  card.querySelector('.approve-btn')?.addEventListener('click', (e) => handleAction(e, 'approved'));
  card.querySelector('.reject-btn')?.addEventListener('click', (e) => handleAction(e, 'rejected'));
  card.querySelector('.edit-btn')?.addEventListener('click', (e) => enterEditMode(e));
}

async function saveEdit(card, id) {
  const saveBtn = card.querySelector('.save-edit-btn');
  const cancelBtn = card.querySelector('.cancel-edit-btn');

  const name = card.querySelector('.edit-name').value.trim();
  const semester = card.querySelector('.edit-semester').value;
  const subject = card.querySelector('.edit-subject').value;
  const type = card.querySelector('.edit-type').value;
  const author = card.querySelector('.edit-author').value.trim();

  if (!name || !semester || !subject || !type) {
    alert("Please fill in Document Title, Semester, Subject, and Resource Type before saving.");
    return;
  }

  saveBtn.disabled = true;
  cancelBtn.disabled = true;
  saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;

  const updatedFields = {
    name,
    semester,
    subject,
    type,
    uploader: author || 'Anonymous'
  };

  try {
    // Enforced the same way as the approve/reject writes below — Firestore
    // Rules require isAdmin() for updates to studyMaterials.
    await updateDoc(doc(db, "studyMaterials", id), updatedFields);

    const merged = { ...pendingMaterials.get(id), ...updatedFields };
    pendingMaterials.set(id, merged);

    card.innerHTML = renderViewMode(id, merged);
    attachCardListenersFor(card);

  } catch (error) {
    console.error("Failed to save metadata:", error);
    alert("Couldn't save changes. You may not have moderator access, or your session expired — try refreshing.");
    saveBtn.disabled = false;
    cancelBtn.disabled = false;
    saveBtn.innerHTML = `<i class="fas fa-check"></i> Save Changes`;
  }
}

// ==========================================
// 5. APPROVE / REJECT ACTIONS
// ==========================================
async function handleAction(e, newStatus) {
  const card = e.target.closest('[data-id]');
  const id = card.dataset.id;
  const buttons = card.querySelectorAll('button');

  // On rejection, give the admin a chance to leave a reason — shown to the
  // student on their My Uploads page. Optional: an empty/cancelled prompt
  // still rejects the item, just without a reason attached.
  let rejectionReason = '';
  if (newStatus === 'rejected') {
    rejectionReason = (prompt('Optional: add a reason for rejecting this submission (shown to the student).') || '').trim();
  }

  buttons.forEach(b => b.disabled = true);
  e.target.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;

  const reviewerName = currentAdmin?.email ? currentAdmin.email.split('@')[0] : 'Admin';
  const updatedFields = {
    status: newStatus,
    reviewedBy: reviewerName,
    reviewedByEmail: currentAdmin?.email || '',
    reviewedAt: Date.now()
  };
  if (newStatus === 'rejected') {
    updatedFields.rejectionReason = rejectionReason || 'No reason given';
  }

  try {
    // Firestore Rules enforce isAdmin() on this write server-side —
    // this call fails safely for anyone without the admin role,
    // regardless of what the client UI shows.
    await updateDoc(doc(db, "studyMaterials", id), updatedFields);

    pendingMaterials.delete(id);
    card.style.opacity = '0';
    card.style.transform = 'translateX(8px)';
    setTimeout(() => {
      card.remove();
      if (queueListEl.children.length === 0) {
        emptyStateEl.classList.remove('hidden');
      }
    }, 200);

  } catch (error) {
    console.error(`Failed to set status to ${newStatus}:`, error);
    alert("Action failed. You may not have moderator access, or your session expired — try refreshing.");
    buttons.forEach(b => b.disabled = false);
    loadPendingMaterials(); // re-render this card in its original state
  }
}