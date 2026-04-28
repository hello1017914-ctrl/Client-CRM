import { auth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, browserPopupRedirectResolver } from './firebase.js';

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
            document.getElementById('user-name').textContent = user.displayName;
            document.getElementById('user-email').textContent = user.email;
            document.getElementById('user-avatar').src = user.photoURL || 'https://via.placeholder.com/40';
            document.getElementById('settings-name').textContent = user.displayName;
            document.getElementById('settings-email').textContent = user.email;
            document.getElementById('settings-avatar').src = user.photoURL || 'https://via.placeholder.com/40';
            document.getElementById('welcome-name').textContent = user.displayName.split(' ')[0];

            if (onUserLogged) onUserLogged(user);
        } else {
            authContainer.classList.remove('hidden');
            appContainer.classList.add('hidden');
            floatingAddBtn.classList.add('hidden');
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
