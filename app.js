// Pre-configured with your Firebase credentials
const firebaseConfig = {
  apiKey: "AIzaSyAn650Dejf3hWcFXlhRmiw7jQCMFM26J2A",
  authDomain: "complaint-system-3cb17.firebaseapp.com",
  projectId: "complaint-system-3cb17",
  storageBucket: "complaint-system-3cb17.firebasestorage.app",
  messagingSenderId: "695979265426",
  appId: "1:695979265426:web:1497bc7cbd94980ad3454b"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Admin Passkey
const MASTER_PIN = "Admin@2026";

// Submission Logic
const complaintForm = document.getElementById('complaintForm');
if (complaintForm) {
  complaintForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = complaintForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting...";

    const trackingId = 'CMP-' + Math.floor(100000 + Math.random() * 900000);
    const newComplaint = {
      trackingId: trackingId,
      fullName: document.getElementById('fullName').value.trim(),
      contact: document.getElementById('contact').value.trim(),
      category: document.getElementById('category').value,
      priority: document.getElementById('priority').value,
      subject: document.getElementById('subject').value.trim(),
      description: document.getElementById('description').value.trim(),
      status: 'Pending',
      createdAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      await db.collection("complaints").add(newComplaint);

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

// Admin Real-time Dashboard Logic
const loginGate = document.getElementById('loginGate');
const adminPanel = document.getElementById('adminPanel');
const authForm = document.getElementById('authForm');
const authError = document.getElementById('authError');
const logoutBtn = document.getElementById('logoutBtn');
const tableBody = document.getElementById('complaintsTableBody');
const statusFilter = document.getElementById('statusFilter');

let globalComplaints = [];

function fetchRealtimeComplaints() {
  if (!tableBody) return;

  db.collection("complaints").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
    globalComplaints = [];
    snapshot.forEach((doc) => {
      globalComplaints.push({ docId: doc.id, ...doc.data() });
    });
    renderTable();
  }, (error) => {
    console.error("Firestore read error:", error);
  });
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
        <span class="font-mono font-bold text-indigo-700">${item.trackingId || 'N/A'}</span>
        <div class="text-xs text-slate-400 mt-0.5">${item.createdAt || ''}</div>
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
        <select onchange="updateStatus('${item.docId}', this.value)" class="text-xs border rounded px-2 py-1 bg-white outline-none">
          <option value="Pending" ${item.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="In Progress" ${item.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Resolved" ${item.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
        </select>
        <button onclick="deleteComplaint('${item.docId}')" class="text-xs text-red-500 hover:text-red-700 ml-2 font-medium">Delete</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

window.updateStatus = async function(docId, newStatus) {
  try {
    await db.collection("complaints").doc(docId).update({ status: newStatus });
  } catch (err) {
    alert("Update failed: " + err.message);
  }
};

window.deleteComplaint = async function(docId) {
  if (confirm("Delete this complaint from the cloud database?")) {
    try {
      await db.collection("complaints").doc(docId).delete();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  }
};

if (statusFilter) {
  statusFilter.addEventListener('change', renderTable);
}

function unlockAdmin() {
  if (loginGate) loginGate.classList.add('hidden');
  if (adminPanel) adminPanel.classList.remove('hidden');
  fetchRealtimeComplaints();
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