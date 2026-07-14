const axios = require('axios');
const token = process.argv[2] || process.env.TOKEN;
if (!token) {
  console.error('Usage: node test_reports.js <TOKEN>');
  process.exit(1);
}
(async () => {
  try {
    const res = await axios.get('http://127.0.0.1:5001/api/erp/reports/sales?days=7', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('HTTP', err.response.status, err.response.data);
    } else {
      console.error(err.message);
    }
    process.exit(1);
  }
})();
