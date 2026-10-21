// Storage Key for Local Dashboard Records
const STORAGE_KEY = 'complaint_records_v1';

// Admin Master Passkey
const MASTER_PIN = "Admin@2026";

// Helpers to get/set data
function getComplaints() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveComplaints(complaints) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
}

// ------------------------------------
// 1. Complaint Submission Flow (index.html)
// ------------------------------------
const form = document.getElementById('complaintForm');
const alertBox = document.getElementById('alertBox');
const submitBtn = document.getElementById('submitBtn');
const trackingIdInput = document.getElementById('trackingIdInput');

if (form) {
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Generate unique tracking ticket ID
    const trackingID = 'CMP-' + Math.floor(100000 + Math.random() * 900000);
    if (trackingIdInput) {
      trackingIdInput.value = trackingID;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = 'Submitting to HelpDesk...';

    const formData = new FormData(form);

    // Save record to local dashboard store
    const newComplaint = {
      id: trackingID,
      fullName: document.getElementById('fullName').value.trim(),
      contact: document.getElementById('contact').value.trim(),
      category: document.getElementById('category').value,
      priority: document.getElementById('priority').value,
      subject: document.getElementById('subject').value.trim(),
      description: document.getElementById('description').value.trim(),
      status: 'Pending',
      createdAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    // Forward to Web3Forms for direct email delivery
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    })
      .then(async (response) => {
        const json = await response.json();
        if (response.status === 200) {
          // Persist to local records
          const complaints = getComplaints();
          complaints.unshift(newComplaint);
          saveComplaints(complaints);

          alertBox.className = 'mb-4 p-4 rounded-lg text-sm font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 block';
          alertBox.innerHTML = `<strong>Success!</strong> Your complaint was submitted successfully. Tracking ID: <strong>${trackingID}</strong>. Details have been routed to the administration.`;
          form.reset();
        } else {
          alertBox.className = 'mb-4 p-4 rounded-lg text-sm font-medium bg-red-100 text-red-800 border border-red-300 block';
          alertBox.innerHTML = `<strong>Error:</strong> ${json.message || 'Could not submit your grievance. Try again.'}`;
        }
      })
      .catch((error) => {
        alertBox.className = 'mb-4 p-4 rounded-lg text-sm font-medium bg-red-100 text-red-800 border border-red-300 block';
        alertBox.innerHTML = '<strong>Network Error:</strong> Failed to reach service. Please verify your internet connection.';
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Submit Grievance';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
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

function renderDashboard() {
  if (!tableBody) return;

  const complaints = getComplaints();
  const filter = statusFilter ? statusFilter.value : 'All';

  // Counters
  document.getElementById('statTotal').textContent = complaints.length;
  document.getElementById('statPending').textContent = complaints.filter(c => c.status === 'Pending').length;
  document.getElementById('statProgress').textContent = complaints.filter(c => c.status === 'In Progress').length;
  document.getElementById('statResolved').textContent = complaints.filter(c => c.status === 'Resolved').length;

  const filtered = filter === 'All' ? complaints : complaints.filter(c => c.status === filter);
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
      <td class="p-3">
        <select onchange="updateStatus('${item.id}', this.value)" class="text-xs border rounded px-2 py-1 bg-white outline-none">
          <option value="Pending" ${item.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="In Progress" ${item.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Resolved" ${item.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
        </select>
        <button onclick="deleteComplaint('${item.id}')" class="text-xs text-red-500 hover:text-red-700 ml-2 font-medium">Delete</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// Update status inline
window.updateStatus = function(id, newStatus) {
  const complaints = getComplaints();
  const index = complaints.findIndex(c => c.id === id);
  if (index !== -1) {
    complaints[index].status = newStatus;
    saveComplaints(complaints);
    renderDashboard();
  }
};

// Delete record inline
window.deleteComplaint = function(id) {
  if (confirm(`Are you sure you want to delete complaint ${id}?`)) {
    let complaints = getComplaints();
    complaints = complaints.filter(c => c.id !== id);
    saveComplaints(complaints);
    renderDashboard();
  }
};

if (statusFilter) {
  statusFilter.addEventListener('change', renderDashboard);
}

const clearDataBtn = document.getElementById('clearDataBtn');
if (clearDataBtn) {
  clearDataBtn.addEventListener('click', () => {
    if (confirm('Clear all stored complaint data from this device?')) {
      localStorage.removeItem(STORAGE_KEY);
      renderDashboard();
    }
  });
}

// Password verification gate
function unlockAdmin() {
  if (loginGate) loginGate.classList.add('hidden');
  if (adminPanel) adminPanel.classList.remove('hidden');
  renderDashboard();
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

// Auto-unlock if authenticated in current session
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('complaintsTableBody')) {
    if (sessionStorage.getItem('admin_unlocked') === 'true') {
      unlockAdmin();
    }
  }
});