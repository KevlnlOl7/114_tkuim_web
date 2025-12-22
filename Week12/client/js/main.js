const API_URL = '';
let token = localStorage.getItem('token');
let user = (() => {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch (e) {
        return null;
    }
})();

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const addSignupForm = document.getElementById('addSignupForm');
const authSection = document.getElementById('authSection');
const mainApp = document.getElementById('mainApp');
const userInfo = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');
const messageDiv = document.getElementById('message');
const signupTableBody = document.querySelector('#signupTable tbody');
const refreshBtn = document.getElementById('refreshBtn');

function updateUI() {
    if (token && user) {
        authSection.classList.add('hidden');
        mainApp.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        userInfo.textContent = `Logged in as: ${user.email} (${user.role})`;
        fetchSignups();
    } else {
        authSection.classList.remove('hidden');
        mainApp.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        userInfo.textContent = 'Not logged in';
    }
}

function showMessage(msg, isError = true) {
    messageDiv.textContent = msg;
    messageDiv.style.color = isError ? 'red' : 'green';
    setTimeout(() => messageDiv.textContent = '', 3000);
}

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            token = data.token;
            user = data.user;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            updateUI();
            showMessage('Login successful', false);
        } else {
            showMessage(data.error);
        }
    } catch (error) {
        showMessage('Login failed: ' + error.message);
    }
});

// Register
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;

    try {
        const res = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });
        const data = await res.json();
        if (res.ok) {
            showMessage('Registered successfully. Please login.', false);
            registerForm.reset();
        } else {
            showMessage(data.error);
        }
    } catch (error) {
        showMessage('Registration failed: ' + error.message);
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    token = null;
    user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateUI();
});

// Add Signup
addSignupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('signupContent').value;

    try {
        const res = await fetch(`${API_URL}/api/signup`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });
        if (res.ok) {
            addSignupForm.reset();
            fetchSignups();
            showMessage('Added successfully', false);
        } else {
            const data = await res.json();
            showMessage(data.error);
        }
    } catch (error) {
        showMessage('Add failed: ' + error.message);
    }
});

// Fetch Signups
async function fetchSignups() {
    try {
        const res = await fetch(`${API_URL}/api/signup`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            renderTable(data);
        } else {
            if (res.status === 401 || res.status === 403) {
                // potentially token expired
                logoutBtn.click();
            }
        }
    } catch (error) {
        console.error(error);
    }
}

function renderTable(data) {
    signupTableBody.innerHTML = '';
    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.content}</td>
            <td>${item.creatorEmail || 'Unknown'}</td>
            <td>
                <button onclick="deleteSignup('${item._id}')">Delete</button>
            </td>
        `;
        signupTableBody.appendChild(tr);
    });
}

// Delete Signup
window.deleteSignup = async (id) => {
    if (!confirm('Are you sure?')) return;
    try {
        const res = await fetch(`${API_URL}/api/signup/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            fetchSignups();
            showMessage('Deleted successfully', false);
        } else {
            const data = await res.json();
            showMessage(data.error);
        }
    } catch (error) {
        showMessage('Delete failed: ' + error.message);
    }
};

refreshBtn.addEventListener('click', fetchSignups);

// Init
updateUI();
