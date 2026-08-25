import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, query, where, orderBy, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-init.js';
import { initThemeToggle } from './theme-toggle.js';
import { escapeHTML } from './utils.js';

initThemeToggle();

const checkingAccessEl = document.getElementById('checking-access');
const accessDeniedEl = document.getElementById('access-denied');
const moderationContentEl = document.getElementById('moderation-content');
const queueListEl = document.getElementById('queue-list');
const emptyStateEl = document.getElementById('empty-state');

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
      queueListEl.insertAdjacentHTML('beforeend', renderCard(docSnap.id, data));
    });

    attachCardListeners();

  } catch (error) {
    console.error("Error loading pending materials:", error);
    queueListEl.innerHTML = `<div class="text-center py-12 text-rose-500">Failed to load queue. Check the console for a Firestore index link if this is the first run.</div>`;
  }
}

function renderCard(id, data) {
  const fileUrl = escapeHTML(data.fileUrl || '#');
  return `
    <div class="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors" data-id="${escapeHTML(id)}">
      <div class="flex items-start gap-4 min-w-0">
        <div class="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
          <i class="fas fa-file-lines"></i>
        </div>
        <div class="min-w-0">
          <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="font-bold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors truncate block">
            ${escapeHTML(data.name) || 'Untitled Document'}
          </a>
          <div class="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span><i class="fas fa-book mr-1"></i>${escapeHTML(data.subject) || 'General'}</span>
            <span><i class="fas fa-layer-group mr-1"></i>${escapeHTML(data.semester) || '—'}</span>
            <span><i class="fas fa-tag mr-1"></i>${escapeHTML(data.type) || 'Resource'}</span>
            <span><i class="fas fa-user mr-1"></i>${escapeHTML(data.uploader) || 'Anonymous'}</span>
            <span><i class="fas fa-clock mr-1"></i>${escapeHTML(data.date) || 'Recent'}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
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

// ==========================================
// 3. APPROVE / REJECT ACTIONS
// ==========================================
function attachCardListeners() {
  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', (e) => handleAction(e, 'approved'));
  });
  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', (e) => handleAction(e, 'rejected'));
  });
}

async function handleAction(e, newStatus) {
  const card = e.target.closest('[data-id]');
  const id = card.dataset.id;
  const buttons = card.querySelectorAll('button');

  buttons.forEach(b => b.disabled = true);
  e.target.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;

  try {
    // Firestore Rules enforce isAdmin() on this write server-side —
    // this call fails safely for anyone without the admin role,
    // regardless of what the client UI shows.
    await updateDoc(doc(db, "studyMaterials", id), { status: newStatus });

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