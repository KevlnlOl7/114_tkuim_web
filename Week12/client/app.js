// State
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || 'null');

// Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const logoutBtn = document.getElementById('logout-btn');
const addDataBtn = document.getElementById('add-data-btn');
const dataList = document.getElementById('data-list');

// Init
function init() {
    if (token && user) {
        showDashboard();
    } else {
        showAuth();
    }
}

function showAuth() {
    if (authSection) authSection.classList.remove('hidden');
    if (dashboardSection) dashboardSection.classList.add('hidden');
}

function showDashboard() {
    if (authSection) authSection.classList.add('hidden');
    if (dashboardSection) dashboardSection.classList.remove('hidden');
    if (document.getElementById('user-role-display')) document.getElementById('user-role-display').textContent = user.role;

    // Show logs section if admin
    const logsSection = document.getElementById('admin-logs-section');
    if (user.role === 'admin' && logsSection) {
        logsSection.classList.remove('hidden');
        loadLogs();
        document.getElementById('refresh-logs-btn').addEventListener('click', loadLogs);
    }

    loadData();
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        token = null;
        user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
    });
}

async function loadLogs() {
    try {
        const res = await fetch('/api/logs', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const logs = await res.json();
            const logsList = document.getElementById('logs-list');
            if (logsList) {
                logsList.innerHTML = logs.map(log => `
                    <div style="border-bottom: 1px solid #ddd; padding: 5px; font-size: 0.9em;">
                        <strong>${new Date(log.createdAt).toLocaleString()}</strong>: 
                        User ${log.email} performed <code>${log.method} ${log.path}</code>
                    </div>
                `).join('');
            }
        }
    } catch (err) {
        console.error('Failed to load logs', err);
    }
}

// Data Handlers
async function loadData() {
    try {
        const res = await fetch('/api/signup', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const items = await res.json();

        if (dataList) {
            dataList.innerHTML = items.map(item => `
                <div class="data-item">
                    <div class="data-info">
                        <div>${item.content}</div>
                        <small>Owner: ${item.creatorEmail || item.created_by} | Created: ${new Date(item.createdAt).toLocaleString()}</small>
                    </div>
                    <button class="delete-btn" onclick="deleteItem('${item._id}')">Delete</button>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Failed to load data', err);
    }
}

if (addDataBtn) {
    addDataBtn.addEventListener('click', async () => {
        const content = document.getElementById('new-data-content').value;
        if (!content) return;

        try {
            const res = await fetch('/api/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });

            if (res.ok) {
                document.getElementById('new-data-content').value = '';
                loadData();
            } else {
                alert('Failed to add data');
            }
        } catch (err) {
            console.error(err);
        }
    });
}

window.deleteItem = async (id) => {
    if (!confirm('Are you sure?')) return;

    try {
        const res = await fetch(`/api/signup/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            loadData();
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to delete');
        }
    } catch (err) {
        console.error(err);
    }
};

init();
