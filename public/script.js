const shortenForm = document.getElementById('shorten-form');
const longUrlInput = document.getElementById('long-url');
const shortenError = document.getElementById('shorten-error');
const resultBox = document.getElementById('result');
const shortLinkEl = document.getElementById('short-link');
const originalUrlEl = document.getElementById('original-url');
const copyBtn = document.getElementById('copy-btn');

const statsForm = document.getElementById('stats-form');
const statsCodeInput = document.getElementById('stats-code');
const statsError = document.getElementById('stats-error');
const statsResult = document.getElementById('stats-result');
const statsCount = document.getElementById('stats-count');

function showError(el, message) {
  el.textContent = message;
  el.hidden = false;
}

function hideError(el) {
  el.hidden = true;
  el.textContent = '';
}

// Lets someone paste either a bare short code or a full short link
// into the "check stats" field and still work.
function extractShortCode(value) {
  const trimmed = value.trim();
  const parts = trimmed.split('/').filter(Boolean);
  return parts[parts.length - 1] || trimmed;
}

shortenForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(shortenError);
  resultBox.hidden = true;

  const longUrl = longUrlInput.value.trim();
  if (!longUrl) {
    showError(shortenError, 'Paste a URL first.');
    return;
  }

  try {
    const res = await fetch('/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ longUrl }),
    });
    const data = await res.json();

    if (!data.success) {
      showError(shortenError, data.message || 'Something went wrong.');
      return;
    }

    const shortCode = data.data.shortCode;
    const fullShortUrl = `${window.location.origin}/${shortCode}`;

    shortLinkEl.textContent = fullShortUrl;
    shortLinkEl.href = fullShortUrl;
    originalUrlEl.textContent = longUrl;
    resultBox.hidden = false;

    longUrlInput.classList.add('success-flash');
    setTimeout(() => longUrlInput.classList.remove('success-flash'), 600);
  } catch (err) {
    showError(shortenError, 'Could not reach the server. Try again.');
  }
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(shortLinkEl.textContent);
    copyBtn.textContent = 'Copied';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = 'Copy';
      copyBtn.classList.remove('copied');
    }, 1500);
  } catch (err) {
    copyBtn.textContent = 'Failed';
    setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
  }
});

statsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError(statsError);
  statsResult.hidden = true;

  const raw = statsCodeInput.value.trim();
  if (!raw) {
    showError(statsError, 'Enter a short code or link.');
    return;
  }

  const shortCode = extractShortCode(raw);

  try {
    const res = await fetch(`/totalClicks/${shortCode}`);
    const data = await res.json();

    if (!data.success) {
      showError(statsError, data.message || 'Something went wrong.');
      return;
    }

    statsCount.textContent = data.data.totalClicks;
    statsResult.hidden = false;
  } catch (err) {
    showError(statsError, 'Could not reach the server. Try again.');
  }
});