// ==========================================
// 1. CONFIGURATION
// ==========================================
// Paste the URL you got from Google Apps Script here:
const GOOGLE_SCRIPT_WEB_APP_URL = "https://script.google.com/a/macros/ce.iitr.ac.in/s/AKfycbyJsrzqJhRVo0Q8bRna0OIYjhN6c62WGLuezmAeBpGSv9zLXG-jctz0VDQR1DMbe-0beg/exec";

// ==========================================
// 2. THEME TOGGLE LOGIC
// ==========================================
const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');
const themeToggleBtn = document.getElementById('theme-toggle');

// Change the icons inside the button based on previous settings
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

// ==========================================
// 4. DIRECT-TO-DRIVE RESUMABLE UPLOAD
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
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Initializing Upload...`;

  try {
    // 1. Get the Resumable Upload URL from your Apps Script
    const initResponse = await fetch(GOOGLE_SCRIPT_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type
      })
    });
    
    const initResult = await initResponse.json();
    
    if (initResult.status !== "success") {
      throw new Error("Failed to get upload ticket.");
    }

    const uploadUrl = initResult.uploadUrl;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading ${file.name}...`;

    // 2. Upload the raw file directly to Google Drive using PUT
    // This bypasses Apps Script completely, allowing 300MB+ files!
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file, 
      headers: {
        'Content-Length': file.size.toString()
      }
    });

    if (!uploadResponse.ok) {
      throw new Error("Direct upload failed.");
    }

    // 3. Success UI
    btn.innerHTML = `<i class="fas fa-check"></i> Submitted Successfully!`;
    btn.classList.replace('bg-brand-600', 'bg-emerald-600');
    btn.classList.replace('hover:bg-brand-700', 'hover:bg-emerald-700');
    
    console.log("Massive file uploaded directly to your 5TB Drive!");
    setTimeout(() => window.location.href = "index.html", 2000);

  } catch (error) {
    console.error("Upload process failed:", error);
    alert("Upload failed. Please check your connection and try again.");
    btn.innerHTML = originalBtnText;
    btn.disabled = false;
  }
});

  