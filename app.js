// Paste your Google Apps Script Web App URL here:
const SCRIPT_URL = "PASTE_YOUR_GOOGLE_SCRIPT_WEB_APP_URL_HERE";

// Master Admin Password
const MASTER_PIN = "Admin@2026";

// ------------------------------------
// 1. Complaint Submission Flow (index.html)
// ------------------------------------
const complaintForm = document.getElementById('complaintForm');
if (complaintForm) {
  complaintForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = complaintForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting...";

    const trackingId = 'CMP-' + Math.floor(100000 + Math.random() * 900000);
    const payload = {
      id: trackingId,
      name: document.getElementById('fullName').value.trim(),
      contact: document.getElementById('contact').value.trim(),
      category: document.getElementById('category').value,
      priority: document.getElementById('priority').value,
      subject: document.getElementById('subject').value.trim(),
      description: document.getElementById('description').value.trim(),
      status: 'Pending',
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const alertBox = document.getElementById('alertBox');
      alertBox.className = 'mb-4 p-4 rounded-lg text-sm font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 block';
      alertBox.innerHTML = `<strong>Success!</strong> Your complaint was submitted successfully. Tracking ID: <strong>${trackingId}</strong>.`;

      complaintForm.reset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      alert("Submission error: " + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = "Submit Grievance";
    }
  });
}

// ------------------------------------
// 2. Admin Dashboard Flow (dashboard.html)
// ------------------------------------
const loginGate = document.getElementById('loginGate');
const adminPanel = document.getElementById('adminPanel');
const authForm = document.getElementById('authForm');
const authError = document.getElementById('authError');
const logoutBtn = document.getElementById('logoutBtn');
const tableBody = document.getElementById('complaintsTableBody');
const statusFilter = document.getElementById('statusFilter');

let globalComplaints = [];

async function loadCloudComplaints() {
  if (!tableBody) return;
  tableBody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400">Loading complaints from Google Sheet...</td></tr>`;

  try {
    const res = await fetch(SCRIPT_URL);
    globalComplaints = await res.json();
    globalComplaints.reverse(); // Newest first
    renderTable();
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-red-500">Failed to load data. Make sure Script access is set to 'Anyone'.</td></tr>`;
  }
}

function renderTable() {
  const filter = statusFilter ? statusFilter.value : 'All';

  document.getElementById('statTotal').textContent = globalComplaints.length;
  document.getElementById('statPending').textContent = globalComplaints.filter(c => c.status === 'Pending').length;
  document.getElementById('statProgress').textContent = globalComplaints.filter(c => c.status === 'In Progress').length;
  document.getElementById('statResolved').textContent = globalComplaints.filter(c => c.status === 'Resolved').length;

  const filtered = filter === 'All' ? globalComplaints : globalComplaints.filter(c => c.status === filter);
  tableBody.innerHTML = '';
  const noDataMsg = document.getElementById('noDataMessage');

  if (filtered.length === 0) {
    noDataMsg.classList.remove('hidden');
    return;
  } else {
    noDataMsg.classList.add('hidden');
  }

  filtered.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition';
    const normalizedStatusClass = (item.status || 'Pending').replace(/\s+/g, '');

    tr.innerHTML = `
      <td class="p-3">
        <span class="font-mono font-bold text-indigo-700">${item.id}</span>
        <div class="text-xs text-slate-400 mt-0.5">${item.createdAt}</div>
      </td>
      <td class="p-3">
        <div class="font-medium text-slate-800">${item.fullName}</div>
        <div class="text-xs text-slate-500">${item.contact}</div>
      </td>
      <td class="p-3 text-slate-700 font-medium">${item.category}</td>
      <td class="p-3 max-w-xs">
        <div class="font-semibold text-slate-800">${item.subject}</div>
        <p class="text-xs text-slate-500 line-clamp-2 mt-0.5">${item.description}</p>
      </td>
      <td class="p-3 priority-${item.priority}">${item.priority}</td>
      <td class="p-3">
        <span class="status-badge status-${normalizedStatusClass}">${item.status}</span>
      </td>
      <td class="p-3 text-xs text-slate-400">Synced via Sheet</td>
    `;
    tableBody.appendChild(tr);
  });
}

if (statusFilter) {
  statusFilter.addEventListener('change', renderTable);
}

function unlockAdmin() {
  if (loginGate) loginGate.classList.add('hidden');
  if (adminPanel) adminPanel.classList.remove('hidden');
  loadCloudComplaints();
}

if (authForm) {
  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (document.getElementById('adminPin').value === MASTER_PIN) {
      sessionStorage.setItem('admin_unlocked', 'true');
      unlockAdmin();
    } else {
      authError.classList.remove('hidden');
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('admin_unlocked');
    window.location.reload();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('complaintsTableBody')) {
    if (sessionStorage.getItem('admin_unlocked') === 'true') {
      unlockAdmin();
    }
  }
});