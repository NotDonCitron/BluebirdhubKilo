const fs = require('fs');
const path = require('path');

// Function to convert Playwright selectors to Puppeteer-compatible ones
function convertSelector(selector) {
  // Remove :has-text() and :contains() pseudo-selectors
  // These are Playwright-specific and not valid CSS
  return selector
    .split(',')
    .map(s => s.trim())
    .filter(s => !s.includes(':has-text(') && !s.includes(':contains('))
    .join(', ');
}

// Function to process a file
function processFile(filePath) {
  console.log(`Processing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Find all selector strings that contain :has-text or :contains
  const selectorPattern = /(['"`])([^'"`]*(?::has-text|:contains)\([^)]+\)[^'"`]*)(['"`])/g;
  
  content = content.replace(selectorPattern, (match, quote1, selector, quote2) => {
    const converted = convertSelector(selector);
    if (converted !== selector) {
      console.log(`  Converting: ${selector}`);
      console.log(`         To: ${converted || '[REMOVED - no valid CSS selector]'}`);
    }
    
    // If the selector becomes empty after conversion, return a fallback
    if (!converted) {
      // Try to extract a meaningful fallback from the original selector
      const fallback = selector
        .split(',')
        .map(s => s.trim())
        .find(s => !s.includes(':has-text(') && !s.includes(':contains('));
      
      if (fallback) {
        return `${quote1}${fallback}${quote2}`;
      }
      
      // If no valid selector remains, use a data-testid if possible
      const hasTextMatch = selector.match(/:has-text\(["']([^"']+)["']\)/);
      const containsMatch = selector.match(/:contains\(["']([^"']+)["']\)/);
      const text = hasTextMatch ? hasTextMatch[1] : (containsMatch ? containsMatch[1] : '');
      
      if (text) {
        const testId = text.toLowerCase().replace(/\s+/g, '-');
        return `${quote1}[data-testid="${testId}"]${quote2}`;
      }
      
      return match; // Keep original if we can't convert
    }
    
    return `${quote1}${converted}${quote2}`;
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`  Updated ${filePath}`);
  } else {
    console.log(`  No changes needed`);
  }
}

// Process all test files
const testDir = path.join(__dirname, 'tests', 'e2e');
const files = fs.readdirSync(testDir).filter(f => f.endsWith('.test.ts'));

console.log('Fixing Playwright-specific selectors in test files...\n');

files.forEach(file => {
  processFile(path.join(testDir, file));
});

console.log('\nDone!');