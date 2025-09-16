(async () => {
  try {
    const url = 'http://localhost:3000/api/reports?type=both&startDate=2025-09-01&endDate=2025-09-16&page=1&pageSize=50';
    const res = await fetch(url);
    if (!res.ok) {
      console.error('Request failed', res.status, await res.text());
      process.exit(1);
    }
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Fetch error', err);
    process.exit(1);
  }
})();
