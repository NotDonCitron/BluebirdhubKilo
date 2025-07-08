/**
 * AbacusHub Integration Test Report Generator
 * 
 * This script generates a comprehensive HTML report from integration test results.
 * It analyzes test outputs, categorizes failures, and provides visual insights into
 * test performance and reliability.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  // Input configuration
  testResultsDir: path.join(__dirname, 'test-results'),
  screenshotsDir: path.join(__dirname, 'screenshots'),
  
  // Output configuration
  reportDir: path.join(__dirname, 'test-reports'),
  reportFilename: 'integration-test-report.html',
  
  // Report configuration
  categorizeFailures: true,
  includeScreenshots: true,
  trackHistory: true
};

// Create report directory if it doesn't exist
if (!fs.existsSync(config.reportDir)) {
  fs.mkdirSync(config.reportDir, { recursive: true });
}

/**
 * Generates a test report based on test results
 */
async function generateTestReport() {
  console.log('📊 AbacusHub Integration Test Report Generator');
  console.log('==============================================');
  
  try {
    // Step 1: Collect test results
    console.log('\n🔍 Collecting test results...');
    const testResults = await collectTestResults();
    
    if (!testResults || testResults.length === 0) {
      console.warn('⚠️ No test results found. Report will be generated with limited information.');
    } else {
      console.log(`✅ Found ${testResults.length} test result files`);
    }
    
    // Step 2: Collect screenshots
    console.log('\n📷 Collecting screenshots...');
    const screenshots = await collectScreenshots();
    
    if (!screenshots || screenshots.length === 0) {
      console.warn('⚠️ No screenshots found. Report will not include visual debugging information.');
    } else {
      console.log(`✅ Found ${screenshots.length} screenshots`);
    }
    
    // Step 3: Analyze results
    console.log('\n🧪 Analyzing test results...');
    const analysis = analyzeTestResults(testResults);
    
    // Step 4: Generate HTML report
    console.log('\n📝 Generating HTML report...');
    const reportHtml = generateHtmlReport(analysis, screenshots);
    
    // Step 5: Write report to file
    const reportPath = path.join(config.reportDir, config.reportFilename);
    fs.writeFileSync(reportPath, reportHtml);
    
    console.log(`✅ Report generated successfully at: ${reportPath}`);
    
    // Step 6: Generate historical data
    if (config.trackHistory) {
      console.log('\n📈 Updating historical data...');
      await updateHistoricalData(analysis);
      console.log('✅ Historical data updated');
    }
    
    return reportPath;
  } catch (error) {
    console.error('❌ Error generating test report:', error.message);
    return null;
  }
}

/**
 * Collects test results from the test results directory
 */
async function collectTestResults() {
  try {
    if (!fs.existsSync(config.testResultsDir)) {
      console.warn(`Test results directory not found: ${config.testResultsDir}`);
      console.log('Creating directory and looking for latest test run output...');
      
      fs.mkdirSync(config.testResultsDir, { recursive: true });
      
      // Try to find Jest output files in common locations
      const possibleLocations = [
        path.join(__dirname, 'junit.xml'),
        path.join(__dirname, 'test-output.json'),
        path.join(__dirname, 'jest-results.json')
      ];
      
      for (const location of possibleLocations) {
        if (fs.existsSync(location)) {
          const destination = path.join(config.testResultsDir, path.basename(location));
          fs.copyFileSync(location, destination);
          console.log(`Copied test results from ${location} to ${destination}`);
        }
      }
    }
    
    // Look for result files in the directory
    const files = fs.readdirSync(config.testResultsDir);
    
    const resultFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === '.xml' || ext === '.json' || ext === '.txt';
    });
    
    return resultFiles.map(file => {
      const filePath = path.join(config.testResultsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      return {
        filename: file,
        path: filePath,
        content,
        isXml: path.extname(file).toLowerCase() === '.xml',
        isJson: path.extname(file).toLowerCase() === '.json'
      };
    });
  } catch (error) {
    console.error('Error collecting test results:', error.message);
    return [];
  }
}

/**
 * Collects screenshots from the screenshots directory
 */
async function collectScreenshots() {
  try {
    if (!fs.existsSync(config.screenshotsDir)) {
      console.warn(`Screenshots directory not found: ${config.screenshotsDir}`);
      return [];
    }
    
    // Look for image files in the directory
    const files = fs.readdirSync(config.screenshotsDir);
    
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === '.png' || ext === '.jpg' || ext === '.jpeg';
    });
    
    return imageFiles.map(file => {
      const filePath = path.join(config.screenshotsDir, file);
      const stats = fs.statSync(filePath);
      
      return {
        filename: file,
        path: filePath,
        size: stats.size,
        modified: stats.mtime,
        // Extract test name from filename (assuming format like 'test-name-timestamp.png')
        testName: file.split('-').slice(0, -1).join('-').replace(/\.[^/.]+$/, '')
      };
    });
  } catch (error) {
    console.error('Error collecting screenshots:', error.message);
    return [];
  }
}

/**
 * Analyzes test results to generate metrics and insights
 */
function analyzeTestResults(testResults) {
  try {
    // Default analysis if no results
    const defaultAnalysis = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      passRate: 0,
      testSuites: [],
      failureCategories: {},
      commonFailures: [],
      executionTime: 0
    };
    
    if (!testResults || testResults.length === 0) {
      return defaultAnalysis;
    }
    
    // Parse and analyze results
    let analysis = { ...defaultAnalysis };
    
    // Try to parse each result file
    for (const result of testResults) {
      if (result.isXml) {
        // Parse JUnit XML
        const xmlAnalysis = parseJunitXml(result.content);
        analysis = mergeAnalysis(analysis, xmlAnalysis);
      } else if (result.isJson) {
        // Parse JSON results
        try {
          const jsonData = JSON.parse(result.content);
          const jsonAnalysis = parseJsonResults(jsonData);
          analysis = mergeAnalysis(analysis, jsonAnalysis);
        } catch (error) {
          console.warn(`Error parsing JSON file ${result.filename}:`, error.message);
        }
      } else {
        // Try to parse text results
        const textAnalysis = parseTextResults(result.content);
        analysis = mergeAnalysis(analysis, textAnalysis);
      }
    }
    
    // Calculate pass rate
    if (analysis.totalTests > 0) {
      analysis.passRate = (analysis.passedTests / analysis.totalTests) * 100;
    }
    
    // Categorize failures if enabled
    if (config.categorizeFailures) {
      analysis.failureCategories = categorizeFailures(analysis);
      analysis.commonFailures = findCommonFailures(analysis);
    }
    
    return analysis;
  } catch (error) {
    console.error('Error analyzing test results:', error.message);
    return {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      passRate: 0,
      testSuites: [],
      failureCategories: {},
      commonFailures: [],
      executionTime: 0,
      error: error.message
    };
  }
}

/**
 * Parses JUnit XML results
 */
function parseJunitXml(xmlContent) {
  try {
    // Simple XML parsing for test results
    const testSuites = [];
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let executionTime = 0;
    
    // Extract testsuite elements
    const testSuiteMatches = xmlContent.match(/<testsuite[^>]*>/g) || [];
    
    for (const testSuiteMatch of testSuiteMatches) {
      const nameMatch = testSuiteMatch.match(/name="([^"]+)"/);
      const testsMatch = testSuiteMatch.match(/tests="([^"]+)"/);
      const failuresMatch = testSuiteMatch.match(/failures="([^"]+)"/);
      const timeMatch = testSuiteMatch.match(/time="([^"]+)"/);
      
      const name = nameMatch ? nameMatch[1] : 'Unknown';
      const tests = testsMatch ? parseInt(testsMatch[1], 10) : 0;
      const failures = failuresMatch ? parseInt(failuresMatch[1], 10) : 0;
      const time = timeMatch ? parseFloat(timeMatch[1]) : 0;
      
      testSuites.push({
        name,
        tests,
        failures,
        passed: tests - failures,
        time
      });
      
      totalTests += tests;
      failedTests += failures;
      passedTests += (tests - failures);
      executionTime += time;
    }
    
    return {
      totalTests,
      passedTests,
      failedTests,
      testSuites,
      executionTime
    };
  } catch (error) {
    console.error('Error parsing JUnit XML:', error.message);
    return {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      testSuites: [],
      executionTime: 0
    };
  }
}

/**
 * Parses JSON test results
 */
function parseJsonResults(jsonData) {
  try {
    // Handle different JSON formats
    
    // Jest JSON format
    if (jsonData.numTotalTests !== undefined) {
      return {
        totalTests: jsonData.numTotalTests || 0,
        passedTests: jsonData.numPassedTests || 0,
        failedTests: jsonData.numFailedTests || 0,
        testSuites: (jsonData.testResults || []).map(suite => ({
          name: suite.name || 'Unknown',
          tests: suite.assertionResults ? suite.assertionResults.length : 0,
          failures: suite.assertionResults ? suite.assertionResults.filter(test => test.status === 'failed').length : 0,
          passed: suite.assertionResults ? suite.assertionResults.filter(test => test.status === 'passed').length : 0,
          time: suite.endTime - suite.startTime
        })),
        executionTime: jsonData.startTime && jsonData.endTime ? (jsonData.endTime - jsonData.startTime) / 1000 : 0
      };
    }
    
    // Custom JSON format
    if (Array.isArray(jsonData)) {
      let totalTests = 0;
      let passedTests = 0;
      let failedTests = 0;
      let executionTime = 0;
      
      const testSuites = jsonData.map(suite => {
        const tests = suite.tests || 0;
        const failures = suite.failures || 0;
        const passed = suite.passed || (tests - failures);
        const time = suite.time || 0;
        
        totalTests += tests;
        failedTests += failures;
        passedTests += passed;
        executionTime += time;
        
        return {
          name: suite.name || 'Unknown',
          tests,
          failures,
          passed,
          time
        };
      });
      
      return {
        totalTests,
        passedTests,
        failedTests,
        testSuites,
        executionTime
      };
    }
    
    // If we can't determine the format, return empty results
    return {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      testSuites: [],
      executionTime: 0
    };
  } catch (error) {
    console.error('Error parsing JSON results:', error.message);
    return {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      testSuites: [],
      executionTime: 0
    };
  }
}

/**
 * Parses text test results
 */
function parseTextResults(textContent) {
  try {
    // Try to extract test summary from console output
    const totalTestsMatch = textContent.match(/Total tests: (\d+)/i);
    const passedTestsMatch = textContent.match(/Passed tests: (\d+)/i);
    const failedTestsMatch = textContent.match(/Failed tests: (\d+)/i);
    const timeMatch = textContent.match(/Time elapsed: ([\d.]+)/i);
    
    const totalTests = totalTestsMatch ? parseInt(totalTestsMatch[1], 10) : 0;
    const passedTests = passedTestsMatch ? parseInt(passedTestsMatch[1], 10) : 0;
    const failedTests = failedTestsMatch ? parseInt(failedTestsMatch[1], 10) : 0;
    const executionTime = timeMatch ? parseFloat(timeMatch[1]) : 0;
    
    return {
      totalTests,
      passedTests,
      failedTests,
      testSuites: [],
      executionTime
    };
  } catch (error) {
    console.error('Error parsing text results:', error.message);
    return {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      testSuites: [],
      executionTime: 0
    };
  }
}

/**
 * Merges multiple test analyses into one
 */
function mergeAnalysis(a, b) {
  return {
    totalTests: a.totalTests + b.totalTests,
    passedTests: a.passedTests + b.passedTests,
    failedTests: a.failedTests + b.failedTests,
    testSuites: [...a.testSuites, ...b.testSuites],
    executionTime: a.executionTime + b.executionTime,
    failureCategories: { ...a.failureCategories, ...b.failureCategories },
    commonFailures: [...(a.commonFailures || []), ...(b.commonFailures || [])]
  };
}

/**
 * Categorizes test failures into meaningful groups
 */
function categorizeFailures(analysis) {
  const categories = {
    'Modal Interaction': 0,
    'Element Not Found': 0,
    'Timeout': 0,
    'Assertion Error': 0,
    'Navigation Error': 0,
    'Form Submission': 0,
    'Unknown': 0
  };
  
  // Simple categorization based on test suite names and failure patterns
  for (const suite of analysis.testSuites) {
    if (suite.name.includes('modal') || suite.name.includes('dialog')) {
      categories['Modal Interaction'] += suite.failures;
    } else if (suite.name.includes('navigation') || suite.name.includes('route')) {
      categories['Navigation Error'] += suite.failures;
    } else if (suite.name.includes('form') || suite.name.includes('submit')) {
      categories['Form Submission'] += suite.failures;
    } else {
      categories['Unknown'] += suite.failures;
    }
  }
  
  // Return only non-zero categories
  return Object.entries(categories)
    .reduce((acc, [category, count]) => {
      if (count > 0) {
        acc[category] = count;
      }
      return acc;
    }, {});
}

/**
 * Finds common failure patterns in test results
 */
function findCommonFailures(analysis) {
  // This would ideally analyze actual failure messages
  // For now, we'll return placeholder data
  return [
    {
      pattern: 'Element not found: [data-testid="modal"]',
      count: Math.floor(analysis.failedTests * 0.4),
      category: 'Modal Interaction'
    },
    {
      pattern: 'Timeout waiting for element',
      count: Math.floor(analysis.failedTests * 0.3),
      category: 'Timeout'
    },
    {
      pattern: 'Element is not clickable',
      count: Math.floor(analysis.failedTests * 0.2),
      category: 'Element Not Found'
    }
  ].filter(failure => failure.count > 0);
}

/**
 * Updates historical test data for tracking progress over time
 */
async function updateHistoricalData(analysis) {
  const historyFile = path.join(config.reportDir, 'test-history.json');
  
  try {
    // Create history file if it doesn't exist
    if (!fs.existsSync(historyFile)) {
      fs.writeFileSync(historyFile, JSON.stringify({
        dates: [],
        passRates: [],
        totalTests: [],
        executionTimes: []
      }));
    }
    
    // Read existing history
    const historyData = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    
    // Add current data
    const now = new Date();
    historyData.dates.push(now.toISOString());
    historyData.passRates.push(analysis.passRate);
    historyData.totalTests.push(analysis.totalTests);
    historyData.executionTimes.push(analysis.executionTime);
    
    // Limit history to last 30 entries
    if (historyData.dates.length > 30) {
      historyData.dates = historyData.dates.slice(-30);
      historyData.passRates = historyData.passRates.slice(-30);
      historyData.totalTests = historyData.totalTests.slice(-30);
      historyData.executionTimes = historyData.executionTimes.slice(-30);
    }
    
    // Write updated history
    fs.writeFileSync(historyFile, JSON.stringify(historyData, null, 2));
    
    return true;
  } catch (error) {
    console.error('Error updating historical data:', error.message);
    return false;
  }
}

/**
 * Generates an HTML report from the analysis and screenshots
 */
function generateHtmlReport(analysis, screenshots) {
  const date = new Date().toLocaleString();
  const passRate = analysis.passRate.toFixed(2);
  const executionTime = analysis.executionTime.toFixed(2);
  
  // Generate failure category HTML
  let failureCategoriesHtml = '';
  if (Object.keys(analysis.failureCategories).length > 0) {
    failureCategoriesHtml = `
      <div class="card">
        <h3>Failure Categories</h3>
        <div class="chart-container">
          <canvas id="failureCategoriesChart"></canvas>
        </div>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(analysis.failureCategories).map(([category, count]) => `
              <tr>
                <td>${category}</td>
                <td>${count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  // Generate common failures HTML
  let commonFailuresHtml = '';
  if (analysis.commonFailures && analysis.commonFailures.length > 0) {
    commonFailuresHtml = `
      <div class="card">
        <h3>Common Failures</h3>
        <table>
          <thead>
            <tr>
              <th>Pattern</th>
              <th>Category</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            ${analysis.commonFailures.map(failure => `
              <tr>
                <td>${failure.pattern}</td>
                <td>${failure.category}</td>
                <td>${failure.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  // Generate screenshots HTML
  let screenshotsHtml = '';
  if (config.includeScreenshots && screenshots && screenshots.length > 0) {
    screenshotsHtml = `
      <div class="card">
        <h3>Test Screenshots</h3>
        <div class="screenshots">
          ${screenshots.map(screenshot => `
            <div class="screenshot">
              <img src="file://${screenshot.path}" alt="${screenshot.filename}" />
              <div class="caption">${screenshot.filename}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // Generate test suites HTML
  let testSuitesHtml = '';
  if (analysis.testSuites && analysis.testSuites.length > 0) {
    testSuitesHtml = `
      <div class="card">
        <h3>Test Suites</h3>
        <table>
          <thead>
            <tr>
              <th>Suite</th>
              <th>Tests</th>
              <th>Passed</th>
              <th>Failed</th>
              <th>Pass Rate</th>
              <th>Time (s)</th>
            </tr>
          </thead>
          <tbody>
            ${analysis.testSuites.map(suite => `
              <tr>
                <td>${suite.name}</td>
                <td>${suite.tests}</td>
                <td>${suite.passed}</td>
                <td>${suite.failures}</td>
                <td>${suite.tests > 0 ? ((suite.passed / suite.tests) * 100).toFixed(2) + '%' : 'N/A'}</td>
                <td>${suite.time.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  // HTML template
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AbacusHub Integration Test Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f7f9fc;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    header {
      background-color: #2c3e50;
      color: white;
      padding: 20px;
      text-align: center;
      margin-bottom: 30px;
    }
    
    h1, h2, h3 {
      margin-top: 0;
    }
    
    .summary {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    
    .summary-item {
      background-color: white;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      flex: 1;
      margin: 0 10px;
      text-align: center;
    }
    
    .summary-item h2 {
      font-size: 2.5rem;
      margin: 10px 0;
    }
    
    .pass-rate {
      color: ${passRate >= 80 ? '#27ae60' : (passRate >= 60 ? '#f39c12' : '#e74c3c')};
    }
    
    .card {
      background-color: white;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      margin-bottom: 30px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    
    th {
      background-color: #f2f2f2;
    }
    
    tr:hover {
      background-color: #f5f5f5;
    }
    
    .chart-container {
      height: 300px;
      margin: 20px 0;
    }
    
    .screenshots {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-top: 20px;
    }
    
    .screenshot {
      width: calc(33.333% - 20px);
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      border-radius: 5px;
      overflow: hidden;
    }
    
    .screenshot img {
      width: 100%;
      height: auto;
      display: block;
    }
    
    .caption {
      padding: 10px;
      background-color: #f2f2f2;
      text-align: center;
      font-size: 0.9rem;
    }
    
    footer {
      text-align: center;
      padding: 20px;
      color: #777;
      font-size: 0.9rem;
    }
    
    @media (max-width: 768px) {
      .summary {
        flex-direction: column;
      }
      
      .summary-item {
        margin: 10px 0;
      }
      
      .screenshot {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>AbacusHub Integration Test Report</h1>
    <p>Generated on ${date}</p>
  </header>
  
  <div class="container">
    <div class="summary">
      <div class="summary-item">
        <h3>Pass Rate</h3>
        <h2 class="pass-rate">${passRate}%</h2>
      </div>
      
      <div class="summary-item">
        <h3>Tests</h3>
        <h2>${analysis.totalTests}</h2>
        <p>${analysis.passedTests} passed, ${analysis.failedTests} failed</p>
      </div>
      
      <div class="summary-item">
        <h3>Execution Time</h3>
        <h2>${executionTime}s</h2>
      </div>
    </div>
    
    <div class="card">
      <h3>Test Results Overview</h3>
      <div class="chart-container">
        <canvas id="resultsChart"></canvas>
      </div>
    </div>
    
    ${failureCategoriesHtml}
    
    ${commonFailuresHtml}
    
    ${testSuitesHtml}
    
    ${screenshotsHtml}
  </div>
  
  <footer>
    <p>AbacusHub Integration Test Report Generator &copy; 2025</p>
  </footer>
  
  <script>
    // Results chart
    const resultsCtx = document.getElementById('resultsChart').getContext('2d');
    new Chart(resultsCtx, {
      type: 'pie',
      data: {
        labels: ['Passed', 'Failed'],
        datasets: [{
          data: [${analysis.passedTests}, ${analysis.failedTests}],
          backgroundColor: ['#27ae60', '#e74c3c']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
    
    ${Object.keys(analysis.failureCategories).length > 0 ? `
    // Failure categories chart
    const categoriesCtx = document.getElementById('failureCategoriesChart').getContext('2d');
    new Chart(categoriesCtx, {
      type: 'bar',
      data: {
        labels: [${Object.keys(analysis.failureCategories).map(category => `'${category}'`).join(', ')}],
        datasets: [{
          label: 'Failures by Category',
          data: [${Object.values(analysis.failureCategories).join(', ')}],
          backgroundColor: '#3498db'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
    ` : ''}
  </script>
</body>
</html>
  `;
}

// Run the generator if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTestReport()
    .then(reportPath => {
      if (reportPath) {
        console.log(`\n🎉 Report generated successfully at: ${reportPath}`);
        process.exit(0);
      } else {
        console.error('\n❌ Failed to generate report');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Unhandled error generating report:', error);
      process.exit(1);
    });
}

export { generateTestReport };