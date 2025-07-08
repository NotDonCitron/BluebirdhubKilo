const fs = require('fs');
const path = require('path');

// Function to convert Playwright selectors to Puppeteer-compatible ones
function convertSelector(selector) {
  // Split by comma to handle multiple selectors
  const parts = selector.split(',').map(s => s.trim());
  const converted = [];
  
  for (const part of parts) {
    // Skip Playwright-specific pseudo-selectors
    if (part.includes(':has-text(') || part.includes(':contains(')) {
      // Try to extract meaningful text for data-testid fallback
      let text = '';
      const hasTextMatch = part.match(/:has-text\(["']([^"']+)["']\)/);
      const containsMatch = part.match(/:contains\(["']([^"']+)["']\)/);
      
      if (hasTextMatch) {
        text = hasTextMatch[1];
      } else if (containsMatch) {
        text = containsMatch[1];
      }
      
      // Generate appropriate fallback selectors based on the text
      if (text) {
        const kebabCase = text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        // Add multiple fallback options
        if (text.toLowerCase().includes('create') || text.toLowerCase().includes('new')) {
          converted.push(`[data-testid*="create"]`);
          converted.push(`[data-testid*="new"]`);
          converted.push(`button[aria-label*="${text}" i]`);
        } else if (text.toLowerCase().includes('save') || text.toLowerCase().includes('submit')) {
          converted.push(`button[type="submit"]`);
          converted.push(`[data-testid*="save"]`);
          converted.push(`[data-testid*="submit"]`);
        } else if (text.toLowerCase().includes('cancel')) {
          converted.push(`[data-testid*="cancel"]`);
          converted.push(`button[aria-label*="cancel" i]`);
        } else if (text.toLowerCase().includes('delete') || text.toLowerCase().includes('remove')) {
          converted.push(`[data-testid*="delete"]`);
          converted.push(`[data-testid*="remove"]`);
          converted.push(`button[aria-label*="${text}" i]`);
        } else if (text.toLowerCase().includes('all') || text.toLowerCase().includes('active') || text.toLowerCase().includes('archived')) {
          converted.push(`[data-testid*="filter"]`);
          converted.push(`[data-testid*="${kebabCase}"]`);
        } else {
          // Generic fallback
          converted.push(`[data-testid*="${kebabCase}"]`);
          converted.push(`[aria-label*="${text}" i]`);
        }
      }
    } else {
      // Keep valid CSS selectors
      converted.push(part);
    }
  }
  
  // Remove duplicates and join
  return [...new Set(converted)].join(', ');
}

// Function to process a file
function processFile(filePath) {
  console.log(`\nProcessing ${path.basename(filePath)}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let changeCount = 0;
  
  // Find all selector strings that contain :has-text or :contains
  const selectorPattern = /(['"`])([^'"`]*(?::has-text|:contains)\([^)]+\)[^'"`]*)(['"`])/g;
  
  content = content.replace(selectorPattern, (match, quote1, selector, quote2) => {
    const converted = convertSelector(selector);
    if (converted && converted !== selector) {
      console.log(`  [${++changeCount}] Converting:`);
      console.log(`      From: ${selector}`);
      console.log(`      To:   ${converted}`);
      return `${quote1}${converted}${quote2}`;
    }
    return match;
  });
  
  // Also handle template literals with ${} expressions
  const templatePattern = /\`([^`]*(?::has-text|:contains)\([^)]+\)[^`]*)\`/g;
  
  content = content.replace(templatePattern, (match, template) => {
    // Extract the parts around ${}
    const parts = template.split(/(\$\{[^}]+\})/);
    let changed = false;
    
    const processedParts = parts.map(part => {
      if (part.startsWith('${') && part.endsWith('}')) {
        // This is a variable expression, keep it as is
        return part;
      } else if (part.includes(':has-text(') || part.includes(':contains(')) {
        // This part contains Playwright selectors
        const converted = convertSelector(part);
        if (converted && converted !== part) {
          changed = true;
          return converted;
        }
      }
      return part;
    });
    
    if (changed) {
      console.log(`  [${++changeCount}] Converting template literal:`);
      console.log(`      From: \`${template}\``);
      console.log(`      To:   \`${processedParts.join('')}\``);
      return `\`${processedParts.join('')}\``;
    }
    
    return match;
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Updated with ${changeCount} changes`);
  } else {
    console.log(`  ✅ No changes needed`);
  }
}

// Process all test files
const testDir = path.join(__dirname, 'tests', 'e2e');
const files = fs.readdirSync(testDir).filter(f => f.endsWith('.test.ts'));

console.log('Fixing Playwright-specific selectors in test files...');
console.log('================================================');

files.forEach(file => {
  processFile(path.join(testDir, file));
});

console.log('\n================================================');
console.log('✅ All test files have been processed!');
console.log('\nNote: The converted selectors use data-testid attributes and aria-labels.');
console.log('Make sure your application has appropriate data-testid attributes on interactive elements.');