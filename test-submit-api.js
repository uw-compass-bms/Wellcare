// 测试提交API
const testData = {
  token: "test-token",
  fieldValues: {
    "field-1": "Test signature"
  }
};

fetch('http://localhost:3001/api/signature/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData)
})
.then(res => res.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));
EOF < /dev/null