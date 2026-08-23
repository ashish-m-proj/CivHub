import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 1. CONFIGURATION & FIREBASE SETUP
// ==========================================
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
const db = getFirestore(app);

let currentUser = null;
onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

// Your Google Apps Script Web App URL
const GOOGLE_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyJsrzqJhRVo0Q8bRna0OIYjhN6c62WGLuezmAeBpGSv9zLXG-jctz0VDQR1DMbe-0beg/exec";

// ==========================================
// 2. THEME TOGGLE LOGIC
// ==========================================
const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');
const themeToggleBtn = document.getElementById('theme-toggle');

if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    themeToggleLightIcon.classList.remove('hidden');
    document.documentElement.classList.add('dark');
} else {
    themeToggleDarkIcon.classList.remove('hidden');
}

themeToggleBtn.addEventListener('click', function() {
    themeToggleDarkIcon.classList.toggle('hidden');
    themeToggleLightIcon.classList.toggle('hidden');

    if (localStorage.getItem('color-theme')) {
        if (localStorage.getItem('color-theme') === 'light') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        }
    } else {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        }
    }
});

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


// ==========================================
// 4. FORM SUBMISSION (DRIVE + FIRESTORE)
// ==========================================
document.getElementById('upload-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const file = fileUpload.files[0];
  if (!file) {
    alert("Please select a file first.");
    return;
  }

  const btn = this.querySelector('button[type="submit"]');
  const originalBtnText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Reading File...`;

  try {
    // 1. Convert file to Base64 Text
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = async function() {
      // Strip out the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64String = reader.result.split(',')[1];
      
      btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading to Drive...`;
      
      // 2. Send to Google Apps Script as a standard POST request
      const uploadResponse = await fetch(GOOGLE_SCRIPT_WEB_APP_URL, {
        method: 'POST',
        // Sending as plain text bypasses strict CORS preflight blocking
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          base64: base64String
        })
      });
      
      const uploadResult = await uploadResponse.json();
      if (uploadResult.status !== "success") throw new Error(uploadResult.message);

      // 3. Save the Document Details to Firebase
      btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving to Dashboard...`;
      
      const docData = {
        name: document.getElementById('doc-name').value,
        subject: document.getElementById('subject').value,
        semester: document.getElementById('semester').value,
        type: document.getElementById('type').value,
        uploader: document.getElementById('author').value || (currentUser ? currentUser.email.split('@')[0] : "Student Contributor"),
        fileUrl: uploadResult.fileUrl,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: Date.now()
      };

      await addDoc(collection(db, "studyMaterials"), docData);

      // 4. Success UI
      btn.innerHTML = `<i class="fas fa-check"></i> Submitted Successfully!`;
      btn.classList.replace('bg-brand-600', 'bg-emerald-600');
      btn.classList.replace('hover:bg-brand-700', 'hover:bg-emerald-700');
      
      setTimeout(() => window.location.href = "index.html", 2000);
    };
    
    reader.onerror = function(error) {
      throw new Error("Failed to read file.");
    };

  } catch (error) {
    console.error("Upload failed:", error);
    alert("Upload failed. Please check your connection and try again.");
    btn.innerHTML = originalBtnText;
    btn.disabled = false;
  }
});