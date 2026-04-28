import { auth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, browserPopupRedirectResolver, signInAnonymously } from './firebase.js';

const provider = new GoogleAuthProvider();

export function initAuth(onUserLogged) {
    onAuthStateChanged(auth, (user) => {
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');
        const floatingAddBtn = document.getElementById('floating-add-btn');

        if (user) {
            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            floatingAddBtn.classList.remove('hidden');
            
            // Update UI with user info
            const name = user.displayName || 'Guest User';
            const email = user.email || 'Temporary Account';
            const photo = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1d9e75&color=0a2e24`;

            document.getElementById('user-name').textContent = name;
            document.getElementById('user-email').textContent = email;
            document.getElementById('user-avatar').src = photo;
            document.getElementById('settings-name').textContent = name;
            document.getElementById('settings-email').textContent = email;
            document.getElementById('settings-avatar').src = photo;
            document.getElementById('welcome-name').textContent = name.split(' ')[0];

            if (onUserLogged) onUserLogged(user);
        } else {
            // Auto-sign in anonymously if not logged in
            signInAnonymously(auth).catch((error) => {
                console.error("Anonymous auth failed", error);
                authContainer.classList.remove('hidden');
                appContainer.classList.add('hidden');
                floatingAddBtn.classList.add('hidden');
            });
        }
    });

    const loginBtn = document.getElementById('login-btn');
    loginBtn.addEventListener('click', async () => {
        if (loginBtn.disabled) return;
        
        loginBtn.disabled = true;
        loginBtn.textContent = 'Signing in...';
        
        try {
            await signInWithPopup(auth, provider, browserPopupRedirectResolver);
        } catch (error) {
            console.error('Login failed', error);
            if (error.code === 'auth/popup-blocked') {
                alert('Sign-in popup was blocked. Please enable popups for this site or open the app in a new tab.');
            } else if (error.code === 'auth/cancelled-popup-request') {
                // Ignore silent cancellations
            } else {
                alert('Login failed: ' + error.message);
            }
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = `
                <img src="https://www.google.com/favicon.ico" class="w-5 h-5" alt="Google">
                Sign in with Google
            `;
        }
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout failed', error);
        }
    });
}
