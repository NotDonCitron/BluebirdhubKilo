#!/usr/bin/env node

const http = require('http');

function testCurrentServer() {
  console.log('🧪 Testing current server database configuration...\n');
  
  // Make a request to a custom debug endpoint we can create
  const postData = JSON.stringify({
    email: 'john@doe.com',
    password: 'johndoe123'
  });
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/signin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`Response Status: ${res.statusCode}`);
      console.log(`Response Body: ${data.substring(0, 200)}...`);
      
      if (res.statusCode === 200 || res.statusCode === 302) {
        console.log('✅ Server might be working');
      } else {
        console.log('❌ Server has issues');
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
  });
  
  req.write(postData);
  req.end();
}

testCurrentServer();