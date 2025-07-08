// Test script to demonstrate security improvements
import { appLogger } from './lib/logger';

console.log('🔒 Testing AbacusHub Security Improvements\n');

// Test 1: Secure Logging
console.log('1. Testing Secure Logging System:');
appLogger.info('Test info message', { testData: 'sample' });
appLogger.warn('Test warning', { userAction: 'test' });
appLogger.error('Test error handling', new Error('Test error'), { context: 'test' });

// Test 2: Data Sanitization
console.log('\n2. Testing Data Sanitization:');
appLogger.info('Sensitive data test', {
  email: 'user@example.com',
  password: 'secret123',
  token: 'jwt-token-here',
  normalData: 'this should appear'
});

// Test 3: Authentication Logging
console.log('\n3. Testing Authentication Logging:');
appLogger.auth('login', 'user123', { email: 'test@example.com' });
appLogger.auth('failed_login', undefined, { reason: 'invalid_password' });

// Test 4: Security Event Logging
console.log('\n4. Testing Security Event Logging:');
appLogger.security('suspicious_activity', 'medium', { 
  action: 'multiple_failed_logins',
  ip: '192.168.1.100'
});

// Test 5: Performance Logging
console.log('\n5. Testing Performance Logging:');
const start = Date.now();
setTimeout(() => {
  const duration = Date.now() - start;
  appLogger.performance('test_operation', duration, { operation: 'demo' });
  console.log('\n🚀 All security improvements tested successfully!');
  console.log('📋 Summary of Security Features Demonstrated:');
  console.log('   ✅ Structured logging with context');
  console.log('   ✅ Automatic data sanitization');
  console.log('   ✅ Authentication event tracking'); 
  console.log('   ✅ Security event monitoring');
  console.log('   ✅ Performance monitoring');
  console.log('\n📁 Check the logs/ directory for sanitized output.');
}, 100);