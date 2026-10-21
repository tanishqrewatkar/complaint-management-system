const form = document.getElementById('complaintForm');
const alertBox = document.getElementById('alertBox');
const submitBtn = document.getElementById('submitBtn');
const trackingIdInput = document.getElementById('trackingIdInput');

if (form) {
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // 1. Generate unique tracking ticket ID
    const trackingID = 'CMP-' + Math.floor(100000 + Math.random() * 900000);
    if (trackingIdInput) {
      trackingIdInput.value = trackingID;
    }

    // 2. Button state handling
    submitBtn.disabled = true;
    submitBtn.innerText = 'Submitting to HelpDesk...';

    // 3. Prepare Form Payload
    const formData = new FormData(form);

    // 4. Send directly to Web3Forms
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    })
      .then(async (response) => {
        const json = await response.json();
        if (response.status === 200) {
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