import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
// Set up Google Auth Provider
const googleProvider = new GoogleAuthProvider();
// Force Google UI to only allow your college domain
googleProvider.setCustomParameters({
  hd: 'ce.iitr.ac.in'
});

// Check if user is ALREADY logged in. If yes, kick them straight to the dashboard.
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "index.html";
  }
});

// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorDiv = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const submitBtn = document.getElementById('submit-btn');

// Toggle State
let isSignUpMode = false;
const toggleBtn = document.getElementById('toggle-auth-btn');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const toggleText = document.getElementById('toggle-text');

toggleBtn.addEventListener('click', () => {
  isSignUpMode = !isSignUpMode;
  errorDiv.classList.add('hidden');
  
  if (isSignUpMode) {
    authTitle.innerText = "Create an Account";
    authSubtitle.innerText = "Register your institutional email.";
    submitBtn.innerText = "Sign Up";
    toggleText.innerText = "Already have an account?";
    toggleBtn.innerText = "Sign In";
  } else {
    authTitle.innerText = "Sign in to CivHub";
    authSubtitle.innerText = "Use your institutional G-Suite account.";
    submitBtn.innerText = "Authenticate";
    toggleText.innerText = "Don't have an account?";
    toggleBtn.innerText = "Sign Up";
  }
});

// Form Submission
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorDiv.classList.add('hidden');
  
  const email = emailInput.value.toLowerCase().trim();
  const password = passwordInput.value;

  // Domain Check
  if (!email.endsWith("@ce.iitr.ac.in")) {
    errorText.innerText = "Access restricted to @ce.iitr.ac.in emails.";
    errorDiv.classList.remove('hidden');
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;

    if (isSignUpMode) {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    // On success, onAuthStateChanged (at the top) will trigger and redirect the user.

  } catch (error) {
    if (error.code === 'auth/invalid-credential') errorText.innerText = "Incorrect email or password.";
    else if (error.code === 'auth/email-already-in-use') errorText.innerText = "An account with this email already exists.";
    else if (error.code === 'auth/weak-password') errorText.innerText = "Password must be at least 6 characters.";
    else errorText.innerText = "Something went wrong. Please try again.";
    
    errorDiv.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = isSignUpMode ? "Sign Up" : "Authenticate";
  }
});

// Google Sign-In Logic
const googleBtn = document.getElementById('google-login-btn');

googleBtn.addEventListener('click', async () => {
  errorDiv.classList.add('hidden');
  
  try {
    googleBtn.disabled = true;
    googleBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Connecting to Google...`;

    // Trigger the Google popup
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Strict Domain Verification
    if (!user.email.endsWith("@ce.iitr.ac.in")) {
      // If they bypassed the domain lock, immediately log them out
      await signOut(auth);
      
      errorText.innerText = "Access restricted. Please use your official @ce.iitr.ac.in email.";
      errorDiv.classList.remove('hidden');
      return;
    }

    // If successful, onAuthStateChanged (at the top of the file) will redirect them to the dashboard automatically.

  } catch (error) {
    // Only show error if the user didn't simply close the popup
    if (error.code !== 'auth/popup-closed-by-user') {
      errorText.innerText = "Google Sign-In failed. Please try again.";
      errorDiv.classList.remove('hidden');
    }
  } finally {
    // Reset button state
    googleBtn.disabled = false;
    googleBtn.innerHTML = `<img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" class="w-4 h-4"> Sign in with Google`;
  }
});