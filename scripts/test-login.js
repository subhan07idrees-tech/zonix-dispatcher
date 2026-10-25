async function testLogin() {
  try {
    const res = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: 'alpha-team',
        username: 'admin',
        password: 'admin123'
      })
    });
    const data = await res.json();
    console.log('Login Status:', res.status);
    console.log('Login Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Login Error:', err.message);
  }
}
testLogin();
