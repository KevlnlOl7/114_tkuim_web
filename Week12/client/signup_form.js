const signupForm = document.getElementById('signup-form');

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        // Password field ID fix if needed, assuming 'signup-password'
        const password = document.getElementById('signup-password').value;
        const role = document.getElementById('signup-role').value;
        const msgDiv = document.getElementById('signup-message');

        try {
            const res = await fetch('/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role })
            });
            const data = await res.json();

            if (res.ok) {
                msgDiv.textContent = 'Signup successful! Please login.';
                msgDiv.style.color = 'green';
                signupForm.reset();
            } else {
                msgDiv.textContent = data.error;
                msgDiv.style.color = 'red';
            }
        } catch (err) {
            msgDiv.textContent = 'Server error';
        }
    });
}
