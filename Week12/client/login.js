const loginForm = document.getElementById('login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const msgDiv = document.getElementById('login-message');

        try {
            const res = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                msgDiv.textContent = '';
                loginForm.reset();
                window.location.reload(); // Reload to trigger app.js init
            } else {
                msgDiv.textContent = data.error;
                msgDiv.style.color = 'red';
            }
        } catch (err) {
            msgDiv.textContent = 'Server error';
        }
    });
}
