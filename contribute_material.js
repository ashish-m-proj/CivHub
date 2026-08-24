import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-init.js';

const GOOGLE_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyJsrzqJhRVo0Q8bRna0OIYjhN6c62WGLuezmAeBpGSv9zLXG-jctz0VDQR1DMbe-0beg/exec"; // get this after redeploying the hardened script below

let currentUser = null;
onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

import { initThemeToggle } from './theme-toggle.js';
initThemeToggle();

// ==========================================
// 3. FILE UPLOAD UI LOGIC
// ==========================================
const fileUpload = document.getElementById('file-upload');
const fileNameDisplay = document.getElementById('file-name-display');
const fileNameText = document.getElementById('file-name-text');
const dropZone = document.getElementById('drop-zone');

fileUpload.addEventListener('change', function(e) {
  if(e.target.files.length > 0) {
    fileNameText.textContent = e.target.files[0].name;
    fileNameDisplay.classList.remove('hidden');
    dropZone.classList.add('border-brand-500', 'dark:border-brand-400');
  }
});
// Prevent default browser behavior (which would open the file in a new tab)
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// Add a subtle highlight when a file is hovered over the zone
['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, () => dropZone.classList.add('bg-slate-100', 'dark:bg-white/[0.05]'), false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, () => dropZone.classList.remove('bg-slate-100', 'dark:bg-white/[0.05]'), false);
});

// Handle the actual file drop
dropZone.addEventListener('drop', function(e) {
  const dt = e.dataTransfer;
  const files = dt.files;

  if (files.length > 0) {
    // Assign dropped files to the hidden input
    fileUpload.files = files;
    
    // Trigger your existing 'change' listener to update the UI
    fileUpload.dispatchEvent(new Event('change'));
  }
});

// Handle the actual file drop (This should already be here from earlier)
dropZone.addEventListener('drop', function(e) {
  const dt = e.dataTransfer;
  const files = dt.files;

  if (files.length > 0) {
    fileUpload.files = files;
    fileUpload.dispatchEvent(new Event('change'));
  }
});

// ADD THE NEW CLICK LISTENER HERE:
// Trigger file selection when clicking anywhere inside the dashed drop zone
dropZone.addEventListener('click', (e) => {
  if (e.target.id !== 'file-upload') {
    fileUpload.click();
  }
});


document.getElementById('upload-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const file = fileUpload.files[0];
  if (!file) {
    alert("Please select a file first.");
    return;
  }
  if (!currentUser) {
    alert("Please sign in before submitting.");
    return;
  }

  const btn = this.querySelector('button[type="submit"]');
  const originalBtnText = btn.innerHTML;
  btn.disabled = true;

    try {
    const idToken = await currentUser.getIdToken();

    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Reading File...`;

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async function() {
      const base64String = reader.result.split(',')[1];

      btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading to Drive...`;

      const uploadResponse = await fetch(GOOGLE_SCRIPT_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({
          idToken,
          fileName: file.name,
          mimeType: file.type,
          base64: base64String
        })
      });

      const uploadResult = await uploadResponse.json();
      if (uploadResult.status !== "success") throw new Error(uploadResult.message);

      btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving to Dashboard...`;

      const docData = {
        name: document.getElementById('doc-name').value,
        subject: document.getElementById('subject').value,
        semester: document.getElementById('semester').value,
        type: document.getElementById('type').value,
        uploader: document.getElementById('author').value || currentUser.email.split('@')[0],
        uploaderUid: currentUser.uid,
        fileUrl: uploadResult.fileUrl,
        status: "pending",
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: Date.now()
      };

      await addDoc(collection(db, "studyMaterials"), docData);

      btn.innerHTML = `<i class="fas fa-check"></i> Submitted for Review!`;
      btn.classList.replace('bg-brand-600', 'bg-emerald-600');
      btn.classList.replace('hover:bg-brand-700', 'hover:bg-emerald-700');

      setTimeout(() => window.location.href = "index.html", 2000);
    };

    reader.onerror = function() {
      throw new Error("Failed to read file.");
    };

  } catch (error) {
    console.error("Upload failed:", error);
    alert("Upload failed. Please check your connection and try again.");
    btn.innerHTML = originalBtnText;
    btn.disabled = false;
  }
});