// Temporary script to inspect the /api/options response in the browser
fetch('/api/options')
  .then(res => res.json())
  .then(data => console.log('API OPTIONS:', data));
