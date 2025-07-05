#!/usr/bin/env python3
"""
Enhanced Auto-Fixer for Test Files
Addresses the limitations of the original pattern-based approach with:
1. Import statement analysis and auto-insertion
2. Syntax error detection and correction
3. Enhanced async pattern handling
4. TypeScript integration capabilities
5. Semantic analysis for logical errors
"""

import re
import json
import ast
import os
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class FixResult:
    """Result of a fix operation"""
    success: bool
    changes_made: List[str]
    issues_found: List[str]
    file_content: str
    confidence: float  # 0.0 to 1.0

@dataclass
class ImportInfo:
    """Information about an import statement"""
    module: str
    imports: List[str]
    is_default: bool
    line_number: int

class EnhancedAutoFixer:
    """Enhanced auto-fixer with advanced capabilities"""
    
    def __init__(self):
        self.fixes_applied = 0
        self.total_files = 0
        
        # Common React Testing Library imports
        self.common_imports = {
            'cleanup': '@testing-library/react',
            'waitFor': '@testing-library/react',
            'screen': '@testing-library/react',
            'fireEvent': '@testing-library/react',
            'act': '@testing-library/react',
            'render': '@testing-library/react',
            'userEvent': '@testing-library/user-event',
            'jest': '@types/jest',
            'expect': '@testing-library/jest-dom'
        }
        
        # TypeScript common patterns
        self.typescript_patterns = {
            'component_props': r'interface\s+\w+Props\s*{',
            'type_assertion': r'as\s+\w+',
            'generic_type': r'<\w+>',
            'optional_props': r'\w+\?:'
        }
        
        # Async pattern fixes
        self.async_fixes = [
            {
                'pattern': r'it\([\'\"](.*?)[\'\"],\s*\(\)\s*=>\s*{',
                'replacement': r'it(\1, async () => {',
                'condition': lambda content: 'await' in content,
                'description': 'Convert to async test function'
            },
            {
                'pattern': r'setTimeout\(\(\)\s*;\s*=>\s*{',
                'replacement': r'setTimeout(() => {',
                'description': 'Fix malformed setTimeout pattern'
            },
            {
                'pattern': r'waitFor\(\(\)\s*=>\s*expect\((.*?)\)\.toBeInTheDocument\(\);\s*\);',
                'replacement': r'waitFor(() => expect(\1).toBeInTheDocument());',
                'description': 'Fix waitFor pattern with extra semicolon'
            }
        ]
        
        # Syntax error patterns
        self.syntax_fixes = [
            {
                'pattern': r'setSystemTime\(([^)]+);\s*(?!\))',
                'replacement': r'setSystemTime(\1);',
                'description': 'Fix missing closing parenthesis in setSystemTime'
            },
            {
                'pattern': r'expect\(([^)]+)\s*(?!\))',
                'replacement': r'expect(\1)',
                'description': 'Fix unmatched parentheses in expect statements'
            }
        ]

    def analyze_imports(self, content: str) -> Tuple[List[ImportInfo], Set[str]]:
        """Analyze existing imports and find missing ones"""
        lines = content.split('\n')
        existing_imports = []
        missing_functions = set()
        
        # Find existing imports
        for i, line in enumerate(lines):
            if line.strip().startswith('import'):
                # Parse import statement
                if 'from' in line:
                    # Named or default imports
                    parts = line.split('from')
                    if len(parts) == 2:
                        import_part = parts[0].replace('import', '').strip()
                        module_part = parts[1].strip().strip('\'"')
                        
                        # Extract imported names
                        imported_names = []
                        if import_part.startswith('{') and import_part.endswith('}'):
                            # Named imports
                            names = import_part[1:-1].split(',')
                            imported_names = [name.strip() for name in names]
                            existing_imports.append(ImportInfo(module_part, imported_names, False, i))
                        else:
                            # Default import
                            imported_names = [import_part.strip()]
                            existing_imports.append(ImportInfo(module_part, imported_names, True, i))
        
        # Find missing imports by checking function usage
        for func_name, module in self.common_imports.items():
            if func_name in content:
                # Check if already imported
                already_imported = any(
                    func_name in imp.imports for imp in existing_imports
                )
                if not already_imported:
                    missing_functions.add(func_name)
        
        return existing_imports, missing_functions

    def fix_imports(self, content: str) -> Tuple[str, List[str]]:
        """Fix missing imports"""
        lines = content.split('\n')
        existing_imports, missing_functions = self.analyze_imports(content)
        changes = []
        
        if not missing_functions:
            return content, changes
        
        # Group missing functions by module
        missing_by_module = {}
        for func in missing_functions:
            module = self.common_imports[func]
            if module not in missing_by_module:
                missing_by_module[module] = []
            missing_by_module[module].append(func)
        
        # Find insertion point (after existing imports)
        insert_line = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('import'):
                insert_line = i + 1
            elif line.strip() and not line.startswith('//'):
                break
        
        # Insert missing import statements
        new_imports = []
        for module, functions in missing_by_module.items():
            # Check if we can extend existing import
            existing_import = None
            for imp in existing_imports:
                if imp.module == module and not imp.is_default:
                    existing_import = imp
                    break
            
            if existing_import:
                # Extend existing import
                current_line = lines[existing_import.line_number]
                # Extract current imports
                import_match = re.search(r'import\s*{([^}]+)}\s*from', current_line)
                if import_match:
                    current_imports = [imp.strip() for imp in import_match.group(1).split(',')]
                    all_imports = sorted(list(set(current_imports + functions)))
                    new_import_line = f"import {{ {', '.join(all_imports)} }} from '{module}';"
                    lines[existing_import.line_number] = new_import_line
                    changes.append(f"Extended import from {module} with {', '.join(functions)}")
            else:
                # Add new import
                new_import = f"import {{ {', '.join(sorted(functions))} }} from '{module}';"
                new_imports.append(new_import)
                changes.append(f"Added import: {new_import}")
        
        # Insert new imports
        for i, new_import in enumerate(new_imports):
            lines.insert(insert_line + i, new_import)
        
        return '\n'.join(lines), changes

    def fix_syntax_errors(self, content: str) -> Tuple[str, List[str]]:
        """Fix syntax errors using pattern matching"""
        changes = []
        
        for fix in self.syntax_fixes:
            pattern = fix['pattern']
            replacement = fix['replacement']
            description = fix['description']
            
            matches = re.finditer(pattern, content, re.MULTILINE)
            if matches:
                new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
                if new_content != content:
                    content = new_content
                    changes.append(description)
        
        return content, changes

    def fix_async_patterns(self, content: str) -> Tuple[str, List[str]]:
        """Fix async/await patterns"""
        changes = []
        
        for fix in self.async_fixes:
            pattern = fix['pattern']
            replacement = fix['replacement']
            description = fix['description']
            
            # Check condition if present
            if 'condition' in fix:
                if not fix['condition'](content):
                    continue
            
            matches = re.finditer(pattern, content, re.MULTILINE)
            if matches:
                new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
                if new_content != content:
                    content = new_content
                    changes.append(description)
        
        return content, changes

    def fix_typescript_issues(self, content: str) -> Tuple[str, List[str]]:
        """Fix TypeScript-related issues"""
        changes = []
        
        # Fix overly broad type assertions
        type_assertion_pattern = r'as\s+any(?!\w)'
        if re.search(type_assertion_pattern, content):
            # Try to infer better type from context
            content = re.sub(type_assertion_pattern, 'as unknown', content)
            changes.append("Replaced 'as any' with 'as unknown' for better type safety")
        
        # Fix missing type imports
        if 'jest.Mock' in content and 'import' not in content:
            lines = content.split('\n')
            lines.insert(0, "import type { Jest } from '@jest/types';")
            content = '\n'.join(lines)
            changes.append("Added Jest type import")
        
        return content, changes

    def detect_semantic_errors(self, content: str) -> List[str]:
        """Detect semantic errors that require manual review"""
        issues = []
        
        # Check for await in non-async functions
        lines = content.split('\n')
        in_function = False
        function_is_async = False
        
        for i, line in enumerate(lines):
            # Check if entering a function
            if re.search(r'(it|test|describe)\s*\(', line):
                in_function = True
                function_is_async = 'async' in line
            elif line.strip() == '});' and in_function:
                in_function = False
                function_is_async = False
            elif 'await' in line and in_function and not function_is_async:
                issues.append(f"Line {i+1}: Using 'await' in non-async function")
        
        # Check for mock data type mismatches
        if 'mockReturnValue' in content and 'interface' in content:
            issues.append("Potential mock data type mismatch - manual review needed")
        
        return issues

    def fix_file(self, file_path: str, dry_run: bool = False) -> FixResult:
        """Apply all fixes to a single file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            content = original_content
            all_changes = []
            issues = []
            
            # Step 1: Fix imports
            content, import_changes = self.fix_imports(content)
            all_changes.extend(import_changes)
            
            # Step 2: Fix syntax errors
            content, syntax_changes = self.fix_syntax_errors(content)
            all_changes.extend(syntax_changes)
            
            # Step 3: Fix async patterns
            content, async_changes = self.fix_async_patterns(content)
            all_changes.extend(async_changes)
            
            # Step 4: Fix TypeScript issues
            content, ts_changes = self.fix_typescript_issues(content)
            all_changes.extend(ts_changes)
            
            # Step 5: Detect semantic errors
            semantic_issues = self.detect_semantic_errors(content)
            issues.extend(semantic_issues)
            
            # Calculate confidence based on types of fixes
            confidence = 1.0
            if semantic_issues:
                confidence -= 0.3  # Reduce confidence for semantic issues
            if len(all_changes) > 5:
                confidence -= 0.1  # Reduce confidence for many changes
            
            # Write back if changes were made and not dry run
            if not dry_run and content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                logger.info(f"Applied {len(all_changes)} fixes to {file_path}")
            
            return FixResult(
                success=len(all_changes) > 0,
                changes_made=all_changes,
                issues_found=issues,
                file_content=content,
                confidence=confidence
            )
            
        except Exception as e:
            logger.error(f"Error processing {file_path}: {e}")
            return FixResult(
                success=False,
                changes_made=[],
                issues_found=[f"Error: {str(e)}"],
                file_content="",
                confidence=0.0
            )

    def process_directory(self, directory: str, dry_run: bool = True) -> Dict:
        """Process all test files in a directory"""
        test_files = []
        directory_path = Path(directory)
        
        # Find all test files
        for pattern in ['**/*.test.tsx', '**/*.test.ts', '**/*.spec.tsx', '**/*.spec.ts']:
            test_files.extend(directory_path.glob(pattern))
        
        results = {
            'total_files': len(test_files),
            'files_processed': 0,
            'files_fixed': 0,
            'total_changes': 0,
            'high_confidence_fixes': 0,
            'manual_review_needed': 0,
            'detailed_results': []
        }
        
        logger.info(f"Processing {len(test_files)} test files...")
        
        for file_path in test_files:
            result = self.fix_file(str(file_path), dry_run)
            results['files_processed'] += 1
            
            if result.success:
                results['files_fixed'] += 1
                results['total_changes'] += len(result.changes_made)
                
                if result.confidence >= 0.8:
                    results['high_confidence_fixes'] += 1
                
                if result.issues_found:
                    results['manual_review_needed'] += 1
            
            results['detailed_results'].append({
                'file': str(file_path),
                'success': result.success,
                'changes': result.changes_made,
                'issues': result.issues_found,
                'confidence': result.confidence
            })
        
        return results

def main():
    """Main function for testing the enhanced auto-fixer"""
    fixer = EnhancedAutoFixer()
    
    # Process test files
    results = fixer.process_directory('../app/__tests__', dry_run=True)
    
    # Print results
    print("=== ENHANCED AUTO-FIXER RESULTS ===")
    print(f"Total files: {results['total_files']}")
    print(f"Files processed: {results['files_processed']}")
    print(f"Files fixed: {results['files_fixed']}")
    print(f"Total changes: {results['total_changes']}")
    print(f"High confidence fixes: {results['high_confidence_fixes']}")
    print(f"Manual review needed: {results['manual_review_needed']}")
    
    # Save detailed results
    with open('enhanced_fix_report.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print("\nDetailed results saved to enhanced_fix_report.json")

if __name__ == "__main__":
    main()