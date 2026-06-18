const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const token = jwt.sign({ company_id: 'e4bf6f22-6182-414d-afa4-c5449c014323', id: 1 }, process.env.JWT_SECRET || 'secret');

async function test() {
  try {
    const res = await axios.get('http://localhost:5173/api/proposal-history?page=1&limit=10', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(res.data);
  } catch(e) {
    console.error('Err:', e.response ? e.response.data : e.message);
  }
}
test();
