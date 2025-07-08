#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all TypeScript and TSX files with console statements
function findFilesWithConsole() {
  try {
    const output = execSync('grep -r -l "console\\." --include="*.ts" --include="*.tsx" app/', { encoding: 'utf8' });
    return output.trim().split('\n').filter(file => 
      file && 
      !file.includes('node_modules') && 
      !file.includes('scripts/replace-console-logs.js') &&
      !file.includes('lib/logger.ts') &&
      !file.includes('__tests__') &&
      !file.includes('tests/')
    );
  } catch (error) {
    console.log('No console statements found or error occurred:', error.message);
    return [];
  }
}

// Replace console statements with logger
function replaceConsoleInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let newContent = content;
  let hasLogger = false;
  
  // Check if logger is already imported
  if (content.includes("from '@/lib/logger'") || content.includes('appLogger')) {
    hasLogger = true;
  }
  
  // Add logger import if needed and file has console statements
  if (!hasLogger && /console\.(log|error|warn|info|debug)/.test(content)) {
    // Find the last import statement
    const importRegex = /^import .+;$/gm;
    const imports = content.match(importRegex) || [];
    
    if (imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const importIndex = content.lastIndexOf(lastImport);
      const insertIndex = importIndex + lastImport.length;
      
      newContent = content.slice(0, insertIndex) + 
                  "\nimport { appLogger } from '@/lib/logger';" + 
                  content.slice(insertIndex);
      hasLogger = true;
    }
  }
  
  if (hasLogger) {
    // Replace console.log statements
    newContent = newContent.replace(
      /console\.log\((.*?)\);?/g, 
      (match, args) => {
        // Simple heuristic: if it looks like debug info, use debug, else use info
        if (args.includes('debug') || args.includes('Debug') || args.includes('🔍')) {
          return `appLogger.debug(${args});`;
        }
        return `appLogger.info(${args});`;
      }
    );
    
    // Replace console.error statements
    newContent = newContent.replace(
      /console\.error\((.*?)\);?/g,
      'appLogger.error($1);'
    );
    
    // Replace console.warn statements
    newContent = newContent.replace(
      /console\.warn\((.*?)\);?/g,
      'appLogger.warn($1);'
    );
    
    // Replace console.info statements
    newContent = newContent.replace(
      /console\.info\((.*?)\);?/g,
      'appLogger.info($1);'
    );
    
    // Replace console.debug statements
    newContent = newContent.replace(
      /console\.debug\((.*?)\);?/g,
      'appLogger.debug($1);'
    );
  }
  
  // Only write if content changed
  if (newContent !== originalContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ Updated: ${filePath}`);
    return true;
  }
  
  return false;
}

// Main execution
function main() {
  console.log('🔍 Finding files with console statements...');
  const files = findFilesWithConsole();
  
  if (files.length === 0) {
    console.log('✅ No console statements found in production files!');
    return;
  }
  
  console.log(`📝 Found ${files.length} files with console statements:`);
  files.forEach(file => console.log(`   - ${file}`));
  
  let updatedCount = 0;
  
  console.log('\n🔄 Replacing console statements...');
  files.forEach(file => {
    if (replaceConsoleInFile(file)) {
      updatedCount++;
    }
  });
  
  console.log(`\n✅ Updated ${updatedCount} files`);
  console.log('🧹 Console logging cleanup complete!');
  
  // Run verification
  console.log('\n🔍 Verifying cleanup...');
  const remainingFiles = findFilesWithConsole();
  
  if (remainingFiles.length === 0) {
    console.log('✅ All console statements successfully replaced!');
  } else {
    console.log(`⚠️  ${remainingFiles.length} files still have console statements:`);
    remainingFiles.forEach(file => console.log(`   - ${file}`));
    console.log('These may need manual review.');
  }
}

main();