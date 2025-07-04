#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { FormData } = require('formdata-node');
const { fileFromPath } = require('formdata-node/file-from-path');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/upload`;

// Test files
const testFiles = [
  { name: 'small-test.txt', size: 'small', expectedChunks: 1 },
  { name: 'medium-test.bin', size: 'medium', expectedChunks: 2 },
  { name: 'large-test.bin', size: 'large', expectedChunks: 8 }
];

// Utility functions
function generateFileId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function logTest(testName, status, message = '') {
  const timestamp = new Date().toISOString();
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏳';
  console.log(`${statusIcon} [${timestamp}] ${testName}: ${status}${message ? ' - ' + message : ''}`);
}

function logSection(sectionName) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🧪 ${sectionName}`);
  console.log(`${'='.repeat(50)}`);
}

// Test functions
async function testFileExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function testGetFileInfo(filePath) {
  try {
    const stats = await fs.promises.stat(filePath);
    return {
      exists: true,
      size: stats.size,
      chunks: Math.ceil(stats.size / (512 * 1024)) // 512KB chunks
    };
  } catch {
    return { exists: false };
  }
}

async function testChunkUpload(filePath, fileName, fileId, chunkIndex = 0, chunkSize = 512 * 1024) {
  try {
    const buffer = await fs.promises.readFile(filePath);
    const totalChunks = Math.ceil(buffer.length / chunkSize);
    
    if (chunkIndex >= totalChunks) {
      return { success: false, error: 'Chunk index out of range' };
    }
    
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, buffer.length);
    const chunk = buffer.slice(start, end);
    
    const formData = new FormData();
    formData.append('action', 'chunk');
    formData.append('chunk', new Blob([chunk]), `chunk-${chunkIndex}`);
    formData.append('fileName', fileName);
    formData.append('fileId', fileId);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());
    
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: result,
      isComplete: result.uploadComplete || false
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testCompleteUpload(fileId, fileName, totalChunks) {
  try {
    const formData = new FormData();
    formData.append('action', 'complete');
    formData.append('fileId', fileId);
    formData.append('fileName', fileName);
    formData.append('totalChunks', totalChunks.toString());
    
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testFullFileUpload(filePath, fileName) {
  const fileId = generateFileId();
  const fileInfo = await testGetFileInfo(filePath);
  
  if (!fileInfo.exists) {
    return { success: false, error: 'File does not exist' };
  }
  
  const chunkSize = 512 * 1024; // 512KB chunks
  const totalChunks = Math.ceil(fileInfo.size / chunkSize);
  
  logTest(`File Upload Start`, 'INFO', `${fileName} (${fileInfo.size} bytes, ${totalChunks} chunks)`);
  
  // Upload all chunks
  for (let i = 0; i < totalChunks; i++) {
    const chunkResult = await testChunkUpload(filePath, fileName, fileId, i, chunkSize);
    
    if (!chunkResult.success) {
      logTest(`Chunk Upload ${i + 1}/${totalChunks}`, 'FAIL', chunkResult.error);
      return { success: false, error: `Chunk ${i} failed: ${chunkResult.error}` };
    }
    
    logTest(`Chunk Upload ${i + 1}/${totalChunks}`, 'PASS', `Status: ${chunkResult.status}`);
    
    // If upload is complete after this chunk, we're done
    if (chunkResult.isComplete) {
      logTest(`Upload Complete`, 'PASS', `File uploaded successfully`);
      return { success: true, fileId, totalChunks: i + 1 };
    }
  }
  
  // Complete the upload
  const completeResult = await testCompleteUpload(fileId, fileName, totalChunks);
  
  if (!completeResult.success) {
    logTest(`Upload Complete`, 'FAIL', completeResult.error);
    return { success: false, error: `Complete failed: ${completeResult.error}` };
  }
  
  logTest(`Upload Complete`, 'PASS', `File uploaded successfully`);
  return { success: true, fileId, totalChunks };
}

async function testApiEndpointHealth() {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'health' }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    return {
      success: response.status !== 404,
      status: response.status,
      available: response.status !== 404
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testErrorHandling() {
  // Test invalid action
  try {
    const formData = new FormData();
    formData.append('action', 'invalid');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    return {
      invalidAction: {
        success: !response.ok, // We expect this to fail
        status: response.status,
        hasError: result.error !== undefined
      }
    };
  } catch (error) {
    return {
      invalidAction: {
        success: false,
        error: error.message
      }
    };
  }
}

// Main test execution
async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive File Upload System Tests');
  console.log('=' .repeat(80));
  
  // Test 1: Environment and File Preparation
  logSection('Environment & File Preparation');
  
  const testResults = {
    environment: {},
    files: {},
    api: {},
    uploads: {},
    errors: {}
  };
  
  // Check if test files exist
  for (const testFile of testFiles) {
    const filePath = path.join(__dirname, testFile.name);
    const exists = await testFileExists(filePath);
    testResults.files[testFile.name] = { exists, path: filePath };
    
    if (exists) {
      const info = await testGetFileInfo(filePath);
      testResults.files[testFile.name] = { ...testResults.files[testFile.name], ...info };
      logTest(`File Check: ${testFile.name}`, 'PASS', `${info.size} bytes`);
    } else {
      logTest(`File Check: ${testFile.name}`, 'FAIL', 'File not found');
    }
  }
  
  // Test 2: API Endpoint Health
  logSection('API Endpoint Health');
  
  const healthCheck = await testApiEndpointHealth();
  testResults.api.health = healthCheck;
  
  if (healthCheck.available) {
    logTest('API Endpoint', 'PASS', `Status: ${healthCheck.status}`);
  } else {
    logTest('API Endpoint', 'FAIL', healthCheck.error || 'Endpoint not available');
  }
  
  // Test 3: Error Handling
  logSection('Error Handling');
  
  const errorTests = await testErrorHandling();
  testResults.errors = errorTests;
  
  if (errorTests.invalidAction.success) {
    logTest('Invalid Action Handling', 'PASS', 'Properly rejects invalid actions');
  } else {
    logTest('Invalid Action Handling', 'FAIL', errorTests.invalidAction.error || 'Should reject invalid actions');
  }
  
  // Test 4: File Upload Tests
  logSection('File Upload Tests');
  
  for (const testFile of testFiles) {
    const filePath = path.join(__dirname, testFile.name);
    const fileExists = testResults.files[testFile.name].exists;
    
    if (!fileExists) {
      logTest(`Upload Test: ${testFile.name}`, 'SKIP', 'File not found');
      continue;
    }
    
    const uploadResult = await testFullFileUpload(filePath, testFile.name);
    testResults.uploads[testFile.name] = uploadResult;
    
    if (uploadResult.success) {
      logTest(`Upload Test: ${testFile.name}`, 'PASS', `FileID: ${uploadResult.fileId}`);
    } else {
      logTest(`Upload Test: ${testFile.name}`, 'FAIL', uploadResult.error);
    }
  }
  
  // Test Summary
  logSection('Test Summary');
  
  const totalTests = Object.keys(testResults.files).length + 
                    Object.keys(testResults.uploads).length + 2; // +2 for API and error tests
  
  const passedTests = Object.values(testResults.files).filter(f => f.exists).length +
                     Object.values(testResults.uploads).filter(u => u.success).length +
                     (testResults.api.health.available ? 1 : 0) +
                     (testResults.errors.invalidAction.success ? 1 : 0);
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}`);
  
  // Detailed Results
  console.log('\n📋 Detailed Results:');
  console.log(JSON.stringify(testResults, null, 2));
  
  return testResults;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runComprehensiveTests().catch(console.error);
}

module.exports = { runComprehensiveTests };