/**
 * Unified JavaScript Engine: CivicWatch Grievance Redressal
 * Covers both public submission handling (index.html) and administrator operations (dashboard.html).
 */

(function () {
  'use strict';

  // Constants
  const STORAGE_KEY = 'complaint_records_v1';
  const MASTER_PIN = 'Admin@2026';
  const AUTH_SESSION_KEY = 'admin_session_auth';

  /**
   * Helper: Generate Unique Tracking ID
   * Pattern: CMP-XXXXXX (6 alphanumeric random uppercase characters)
   */
  function generateTrackingID() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `CMP-${result}`;
  }

  /**
   * Helper: Retrieve all complaint records from localStorage
   */
  function getRecords() {
    try {
      const records = localStorage.getItem(STORAGE_KEY);
      return records ? JSON.parse(records) : [];
    } catch (e) {
      console.error('Failed to parse complaint records from localStorage', e);
      return [];
    }
  }

  /**
   * Helper: Save complaint records array into localStorage
   */
  function saveRecords(records) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save complaint records to localStorage', e);
    }
  }

  /**
   * Helper: Escape HTML to mitigate XSS in dynamic table renderings
   */
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ==========================================================================
     INDEX.HTML: PUBLIC GRIEVANCE SUBMISSION LOGIC
     ========================================================================== */
  const complaintForm = document.getElementById('complaintForm');

  if (complaintForm) {
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    const successAlert = document.getElementById('successAlert');
    const displayTrackingId = document.getElementById('displayTrackingId');
    const copyIdBtn = document.getElementById('copyIdBtn');

    // Handle Form Submit
    complaintForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const fullName = document.getElementById('fullName').value.trim();
      const contact = document.getElementById('contact').value.trim();
      const category = document.getElementById('category').value;
      const priority = document.getElementById('priority').value;
      const subject = document.getElementById('subject').value.trim();
      const description = document.getElementById('description').value.trim();
      const accessKey = document.getElementById('access_key').value;

      // Basic Validation Check
      if (!fullName || !contact || !category || !priority || !subject || !description) {
        alert('Please complete all required fields.');
        return;
      }

      // Generate Unique Tracking Identifier
      const trackingId = generateTrackingID();
      const now = new Date();
      const dateString = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Build JSON payload for Web3Forms API
      const payload = {
        access_key: accessKey,
        subject: `[${trackingId}] ${priority.toUpperCase()} Grievance: ${subject}`,
        from_name: 'Civic Grievance Desk',
        tracking_id: trackingId,
        citizen_name: fullName,
        contact_information: contact,
        category: category,
        priority: priority,
        grievance_title: subject,
        detailed_description: description,
        submission_timestamp: dateString
      };

      // Set Loading UI State
      submitBtn.disabled = true;
      btnSpinner.classList.remove('hidden');
      btnText.textContent = 'Transmitting...';

      try {
        // Dispatch POST request to Web3Forms API
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.status === 200 && result.success) {
          // Store complaint locally for admin dashboard visibility
          const newComplaint = {
            id: trackingId,
            name: fullName,
            contact: contact,
            category: category,
            priority: priority,
            subject: subject,
            description: description,
            status: 'Pending',
            createdAt: dateString
          };

          const currentRecords = getRecords();
          currentRecords.unshift(newComplaint);
          saveRecords(currentRecords);

          // Update Success UI
          displayTrackingId.textContent = trackingId;
          successAlert.classList.remove('hidden');
          complaintForm.reset();

          // Scroll viewport smoothly to notification banner
          successAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          alert(`Submission could not be completed: ${result.message || 'Please check your connection and try again.'}`);
        }
      } catch (error) {
        console.error('Submission error:', error);
        alert('An unexpected network error occurred while sending your complaint. Please verify your connection.');
      } finally {
        // Reset Button UI State
        submitBtn.disabled = false;
        btnSpinner.classList.add('hidden');
        btnText.textContent = 'Submit Grievance';
      }
    });

    // Copy Tracking ID to Clipboard Button
    if (copyIdBtn) {
      copyIdBtn.addEventListener('click', function () {
        const idText = displayTrackingId.textContent;
        navigator.clipboard.writeText(idText).then(() => {
          const originalText = copyIdBtn.textContent;
          copyIdBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyIdBtn.textContent = originalText;
          }, 2000);
        }).catch(err => {
          console.error('Copy failure:', err);
        });
      });
    }
  }

  /* ==========================================================================
     DASHBOARD.HTML: ADMINISTRATOR OPERATIONS LOGIC
     ========================================================================== */
  const authModal = document.getElementById('authModal');
  const dashboardContainer = document.getElementById('dashboardContainer');

  if (authModal && dashboardContainer) {
    const authForm = document.getElementById('authForm');
    const adminPasscode = document.getElementById('adminPasscode');
    const authError = document.getElementById('authError');
    const logoutBtn = document.getElementById('logoutBtn');
    const resetAllBtn = document.getElementById('resetAllBtn');
    const statusFilter = document.getElementById('statusFilter');
    const complaintsTableBody = document.getElementById('complaintsTableBody');
    const emptyState = document.getElementById('emptyState');

    // Counters
    const totalCount = document.getElementById('totalCount');
    const pendingCount = document.getElementById('pendingCount');
    const inProgressCount = document.getElementById('inProgressCount');
    const resolvedCount = document.getElementById('resolvedCount');

    /**
     * Session Authentication Verifier
     */
    function verifyAuth() {
      const isAuthenticated = sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
      if (isAuthenticated) {
        authModal.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        renderDashboard();
      } else {
        authModal.classList.remove('hidden');
        dashboardContainer.classList.add('hidden');
      }
    }

    // Modal Form Authentication
    authForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const enteredCode = adminPasscode.value.trim();

      if (enteredCode === MASTER_PIN) {
        sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
        authError.classList.add('hidden');
        adminPasscode.value = '';
        authModal.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        renderDashboard();
      } else {
        authError.textContent = 'Invalid administrator passcode. Access denied.';
        authError.classList.remove('hidden');
      }
    });

    // Session Logout / Lock
    logoutBtn.addEventListener('click', function () {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      verifyAuth();
    });

    // Global Wipe / Reset Button
    resetAllBtn.addEventListener('click', function () {
      const confirmed = confirm('WARNING: Are you sure you want to delete all grievance records? This action cannot be reversed.');
      if (confirmed) {
        localStorage.removeItem(STORAGE_KEY);
        renderDashboard();
      }
    });

    // Filter Change Event Listener
    statusFilter.addEventListener('change', function () {
      renderDashboard();
    });

    /**
     * Dashboard Render Function
     */
    function renderDashboard() {
      const records = getRecords();
      const filterValue = statusFilter.value;

      // Calculate Counters
      let pending = 0;
      let inProgress = 0;
      let resolved = 0;

      records.forEach(item => {
        if (item.status === 'Pending') pending++;
        else if (item.status === 'In Progress') inProgress++;
        else if (item.status === 'Resolved') resolved++;
      });

      totalCount.textContent = records.length;
      pendingCount.textContent = pending;
      inProgressCount.textContent = inProgress;
      resolvedCount.textContent = resolved;

      // Filter rows
      const filtered = records.filter(item => {
        if (filterValue === 'All') return true;
        return item.status === filterValue;
      });

      // Render Empty State if no rows
      if (filtered.length === 0) {
        complaintsTableBody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
      }

      emptyState.classList.add('hidden');

      // Populate Table Rows
      complaintsTableBody.innerHTML = filtered.map(item => {
        // Compute Priority Badge Class
        let priorityClass = 'badge-priority-low';
        const pLower = (item.priority || '').toLowerCase();
        if (pLower === 'urgent') priorityClass = 'badge-priority-urgent';
        else if (pLower === 'high') priorityClass = 'badge-priority-high';
        else if (pLower === 'medium') priorityClass = 'badge-priority-medium';

        // Compute Status Badge Class
        let statusBadgeClass = 'badge-status-pending';
        if (item.status === 'In Progress') statusBadgeClass = 'badge-status-inprogress';
        else if (item.status === 'Resolved') statusBadgeClass = 'badge-status-resolved';

        return `
          <tr class="hover:bg-slate-50 transition border-b border-slate-100">
            <!-- Tracking ID & Date -->
            <td class="py-3 px-4 whitespace-nowrap">
              <span class="font-mono font-bold text-indigo-700 block">${escapeHTML(item.id)}</span>
              <span class="text-[11px] text-slate-400 block mt-0.5">${escapeHTML(item.createdAt || 'N/A')}</span>
            </td>

            <!-- Citizen Details -->
            <td class="py-3 px-4">
              <span class="font-semibold text-slate-900 block">${escapeHTML(item.name)}</span>
              <span class="text-[11px] text-slate-500 block">${escapeHTML(item.contact)}</span>
            </td>

            <!-- Category -->
            <td class="py-3 px-4 whitespace-nowrap">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                ${escapeHTML(item.category)}
              </span>
            </td>

            <!-- Subject & Description -->
            <td class="py-3 px-4 max-w-xs">
              <span class="font-semibold text-slate-900 block truncate" title="${escapeHTML(item.subject)}">
                ${escapeHTML(item.subject)}
              </span>
              <p class="text-[11px] text-slate-500 line-clamp-2 mt-0.5" title="${escapeHTML(item.description)}">
                ${escapeHTML(item.description)}
              </p>
            </td>

            <!-- Priority -->
            <td class="py-3 px-4 whitespace-nowrap">
              <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${priorityClass}">
                ${escapeHTML(item.priority)}
              </span>
            </td>

            <!-- Status Selector Dropdown -->
            <td class="py-3 px-4 whitespace-nowrap">
              <div class="flex items-center space-x-2">
                <span class="inline-block w-2 h-2 rounded-full ${item.status === 'Resolved' ? 'bg-emerald-500' : item.status === 'In Progress' ? 'bg-blue-500' : 'bg-amber-500'}"></span>
                <select data-id="${item.id}" class="status-change-dropdown text-xs font-semibold rounded-md border border-slate-300 py-1 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="Pending" ${item.status === 'Pending' ? 'selected' : ''}>Pending</option>
                  <option value="In Progress" ${item.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                  <option value="Resolved" ${item.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                </select>
              </div>
            </td>

            <!-- Action Controls -->
            <td class="py-3 px-4 text-center whitespace-nowrap">
              <button data-id="${item.id}" title="Delete Record"
                class="delete-record-btn p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition">
                <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </td>
          </tr>
        `;
      }).join('');

      // Attach event listeners to inline status dropdowns
      const statusSelects = complaintsTableBody.querySelectorAll('.status-change-dropdown');
      statusSelects.forEach(select => {
        select.addEventListener('change', function () {
          const complaintId = this.getAttribute('data-id');
          const updatedStatus = this.value;
          updateComplaintStatus(complaintId, updatedStatus);
        });
      });

      // Attach event listeners to individual delete buttons
      const deleteButtons = complaintsTableBody.querySelectorAll('.delete-record-btn');
      deleteButtons.forEach(btn => {
        btn.addEventListener('click', function () {
          const complaintId = this.getAttribute('data-id');
          deleteComplaintRecord(complaintId);
        });
      });
    }

    /**
     * Update status for a specific complaint
     */
    function updateComplaintStatus(id, newStatus) {
      const records = getRecords();
      const targetIndex = records.findIndex(r => r.id === id);
      if (targetIndex !== -1) {
        records[targetIndex].status = newStatus;
        saveRecords(records);
        renderDashboard();
      }
    }

    /**
     * Delete an individual complaint record
     */
    function deleteComplaintRecord(id) {
      const confirmed = confirm(`Are you sure you want to delete record ${id}?`);
      if (confirmed) {
        let records = getRecords();
        records = records.filter(r => r.id !== id);
        saveRecords(records);
        renderDashboard();
      }
    }

    // Initial Gatekeeper Check on Page Load
    verifyAuth();
  }
})();