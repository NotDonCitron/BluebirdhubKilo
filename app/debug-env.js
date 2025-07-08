#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function checkEnvironmentVariables() {
  console.log('🌍 === ENVIRONMENT VARIABLES CHECK ===\n');
  
  // Check environment files
  const envFiles = ['.env.local', '.env', '.env.production'];
  
  envFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    console.log(`📄 Checking ${file}:`);
    
    if (fs.existsSync(filePath)) {
      console.log('   ✅ File exists');
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      console.log(`   📝 Variables found: ${lines.length}`);
      
      lines.forEach(line => {
        const [key] = line.split('=');
        if (key) {
          console.log(`   - ${key.trim()}`);
        }
      });
    } else {
      console.log('   ❌ File does not exist');
    }
    console.log('');
  });
  
  // Check process environment variables
  console.log('🔧 Runtime Environment Variables:');
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'NODE_ENV'
  ];
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    console.log(`   ${varName}: ${value ? '✅ SET' : '❌ MISSING'}`);
    if (value) {
      // Show partial value for security
      if (varName.includes('SECRET') || varName.includes('PASSWORD')) {
        console.log(`     Value: ${value.substring(0, 8)}...`);
      } else {
        console.log(`     Value: ${value}`);
      }
    }
  });
  
  console.log('\n🔍 All Environment Variables:');
  Object.keys(process.env)
    .filter(key => key.startsWith('NEXT') || key.includes('AUTH') || key.includes('DATABASE'))
    .sort()
    .forEach(key => {
      const value = process.env[key];
      if (key.includes('SECRET') || key.includes('PASSWORD')) {
        console.log(`   ${key}: ${value ? value.substring(0, 8) + '...' : 'undefined'}`);
      } else {
        console.log(`   ${key}: ${value || 'undefined'}`);
      }
    });
  
  // Check if all required variables are present
  const missing = requiredVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    console.log(`\n❌ Missing required variables: ${missing.join(', ')}`);
    return false;
  } else {
    console.log('\n✅ All required environment variables are set');
    return true;
  }
}

// Test NextAuth configuration loading
function testNextAuthConfig() {
  console.log('\n🔐 === NEXTAUTH CONFIGURATION TEST ===\n');
  
  try {
    // Try to load the auth configuration
    const { authOptions } = require('./lib/auth-config.ts');
    console.log('✅ NextAuth configuration loaded successfully');
    
    // Check providers
    if (authOptions.providers && authOptions.providers.length > 0) {
      console.log(`   Providers: ${authOptions.providers.length} configured`);
      authOptions.providers.forEach((provider, index) => {
        console.log(`   - Provider ${index + 1}: ${provider.name || 'Unknown'}`);
      });
    } else {
      console.log('❌ No providers configured');
    }
    
    // Check session strategy
    console.log(`   Session strategy: ${authOptions.session?.strategy || 'default'}`);
    
    // Check callbacks
    const callbacks = authOptions.callbacks;
    if (callbacks) {
      console.log('   Callbacks configured:');
      Object.keys(callbacks).forEach(callback => {
        console.log(`   - ${callback}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to load NextAuth configuration:', error.message);
    return false;
  }
}

checkEnvironmentVariables();
testNextAuthConfig();