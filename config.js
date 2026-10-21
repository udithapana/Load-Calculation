// Google Sheet connection for the customer form.
// Paste the Apps Script web app URL between the quotes (Deploy → Manage deployments → Web app → URL, ends with /exec).
// Leave it empty ('') and the form falls back to sending a file by WhatsApp / email.
// The team key is NOT stored here – this file is public. Each team member enters the key once in the Load Calculator.
window.HLC_CONFIG = {
  scriptUrl: 'https://script.google.com/macros/s/AKfycbyVWYfgSilurGavthkNw0S2bX8wOykaDC5h9y7PZs0chJCKXYSOPAAgU1ZJUA7-STC5/exec'
};
