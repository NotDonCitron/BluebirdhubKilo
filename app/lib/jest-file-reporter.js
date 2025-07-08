/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const { stripVTControlCharacters } = require('node:util');

class JestFileReporter {
  constructor(globalConfig, options = {}) {
    this.outputPath = options.outputPath || 'logs/test.txt';
    this.globalConfig = globalConfig;
  }

  onRunStart() {
    const dir = path.dirname(this.outputPath);
    fs.mkdirSync(dir, { recursive: true });
    
    // Create empty file
    fs.writeFileSync(this.outputPath, '');
  }

  onTestResult(test, testResult) {
    const testPath = path.relative(process.cwd(), test.path);
    const status = testResult.numFailingTests > 0 ? 'FAIL' : 'PASS';
    
    let output = `${status} ${testPath}\n`;
    
    testResult.testResults.forEach(result => {
      const testStatus = result.status === 'passed' ? '✓' : '✗';
      output += `  ${testStatus} ${result.title}\n`;
      
      if (result.failureMessages.length > 0) {
        result.failureMessages.forEach(message => {
          const cleanMessage = stripVTControlCharacters(message);
          output += `    ${cleanMessage}\n`;
        });
      }
    });
    
    output += '\n';
    fs.appendFileSync(this.outputPath, output);
  }

  onRunComplete() {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(this.outputPath, `\nTest run completed at ${timestamp}\n`);
  }
}

module.exports = JestFileReporter;