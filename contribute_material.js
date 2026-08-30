import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-init.js';
import { getSubjectsForSemester, populateSelect } from './curriculum-data.js';

// Redeploy the Apps Script (AppsScript_Code.gs) and paste the resulting
// /exec URL here.
const GOOGLE_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyFC156b-B32hOzj59fO7piCPtt5kNg8QwVhCwi3VTlwW7CULu-LYk0ccxyG_S0YVrn/exec";

// No longer limited by a single giant base64 payload, so raise this freely.
const MAX_FILE_SIZE_MB = 1000;

// Each chunk is base64-encoded (~33% bigger) and sent as one Apps Script
// request. Keep chunks comfortably under Apps Script's request-size limits;
// 4MB raw (~5.4MB base64) is a safe, still-efficient size.
const CHUNK_SIZE = 4 * 1024 * 1024;

let currentUser = null;
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
});

import { initThemeToggle } from './theme-toggle.js';
initThemeToggle();

// ==========================================
// SEMESTER -> SUBJECT CASCADE
// ==========================================
const semesterSelect = document.getElementById('semester');
const subjectSelect = document.getElementById('subject');

semesterSelect.addEventListener('change', () => {
  const subjects = getSubjectsForSemester(semesterSelect.value);
  populateSelect(subjectSelect, subjects, subjects.length ? 'Select subject' : 'No subjects for this semester');
  subjectSelect.disabled = subjects.length === 0;
});

// ==========================================
// FILE UPLOAD UI (drag/drop + selected-file display)
// ==========================================
const fileUpload = document.getElementById('file-upload');
const fileNameDisplay = document.getElementById('file-name-display');
const fileNameText = document.getElementById('file-name-text');
const dropZone = document.getElementById('drop-zone');

fileUpload.addEventListener('change', function (e) {
  if (e.target.files.length > 0) {
    const file = e.target.files[0];

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`That file is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
      fileUpload.value = '';
      fileNameDisplay.classList.add('hidden');
      return;
    }

    fileNameText.textContent = file.name;
    fileNameDisplay.classList.remove('hidden');
    dropZone.classList.add('border-brand-500', 'dark:border-brand-400');
  }
});

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, () => dropZone.classList.add('bg-slate-100', 'dark:bg-white/[0.05]'), false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, () => dropZone.classList.remove('bg-slate-100', 'dark:bg-white/[0.05]'), false);
});

dropZone.addEventListener('drop', function (e) {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    fileUpload.files = files;
    fileUpload.dispatchEvent(new Event('change'));
  }
});

dropZone.addEventListener('click', (e) => {
  if (e.target.id !== 'file-upload') {
    fileUpload.click();
  }
});

// ==========================================
// APPS SCRIPT HELPER
// Every call here is a plain text/plain POST with no upload-progress
// listener attached, so none of these ever trigger a CORS preflight.
// ==========================================
function callAppsScript(payload) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', GOOGLE_SCRIPT_WEB_APP_URL);
    xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Server responded with status ${xhr.status}`));
        return;
      }
      try {
        const result = JSON.parse(xhr.responseText);
        if (result.status !== 'success') {
          reject(new Error(result.message || 'Apps Script returned an error.'));
          return;
        }
        resolve(result);
      } catch (err) {
        reject(new Error('Invalid response from Apps Script.'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error contacting Apps Script.'));
    xhr.send(JSON.stringify(payload));
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error('Failed to read a chunk of the file.'));
    reader.readAsDataURL(blob);
  });
}

async function callAppsScriptWithRetry(payload, retries = 3) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callAppsScript(payload);
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastErr;
}

// Drives the whole chunked upload. Progress is real: each percentage bump
// reflects a chunk Apps Script has confirmed Drive actually received.
async function uploadFileResumable(file, onProgress) {
  const { uploadId } = await callAppsScriptWithRetry({
    action: 'startSession',
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    fileSize: file.size
  });

  let start = 0;

  while (start < file.size) {
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const chunkBase64 = await blobToBase64(chunk);

    const result = await callAppsScriptWithRetry({
      action: 'uploadChunk',
      uploadId,
      start,
      end,
      chunkBase64
    });

    start = end;
    onProgress(Math.round((start / file.size) * 100));

    if (result.done) {
      return result.fileId;
    }
  }
}

// ==========================================
// FORM SUBMIT
// ==========================================
document.getElementById('upload-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const file = fileUpload.files[0];
  if (!file) {
    alert("Please select a file first.");
    return;
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    alert(`That file is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
    return;
  }
  if (!currentUser) {
    alert("Please sign in before submitting.");
    return;
  }

  const btn = this.querySelector('button[type="submit"]');
  const originalBtnText = btn.innerHTML;
  btn.disabled = true;

  const progressWrap = document.getElementById('upload-progress-wrap');
  const progressBar = document.getElementById('upload-progress-bar');
  const progressPct = document.getElementById('upload-progress-pct');

  progressWrap.classList.remove('hidden');
  progressBar.style.width = '0%';
  progressPct.textContent = '0%';
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading...`;

  try {
    const fileId = await uploadFileResumable(file, (pct) => {
      progressBar.style.width = `${pct}%`;
      progressPct.textContent = `${pct}%`;
    });

    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Finalizing...`;
    const { fileUrl } = await callAppsScriptWithRetry({ action: 'finalize', fileId });

    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving to Dashboard...`;

    const docData = {
      name: document.getElementById('doc-name').value,
      subject: document.getElementById('subject').value,
      semester: document.getElementById('semester').value,
      type: document.getElementById('type').value,
      uploader: document.getElementById('author').value || currentUser.email.split('@')[0],
      uploaderUid: currentUser.uid,
      // Real authenticated identity of whoever submitted this — distinct from
      // "uploader" above, which is just the public credit name the person
      // typed in and can be left blank/anonymous. Admins use this one.
      uploaderEmail: currentUser.email,
      fileUrl,
      status: "pending",
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      timestamp: Date.now()
    };

    await addDoc(collection(db, "studyMaterials"), docData);

    btn.innerHTML = `<i class="fas fa-check"></i> Submitted for Review!`;
    btn.classList.replace('bg-brand-600', 'bg-emerald-600');
    btn.classList.replace('hover:bg-brand-700', 'hover:bg-emerald-700');

    setTimeout(() => window.location.href = "index.html", 2000);

  } catch (error) {
    console.error("Upload failed:", error);
    alert("Upload failed: " + error.message);
    progressWrap.classList.add('hidden');
    btn.innerHTML = originalBtnText;
    btn.disabled = false;
  }
});