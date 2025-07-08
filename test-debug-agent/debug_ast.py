#!/usr/bin/env python3
"""
Debug script to understand AST analysis and fix generation
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ast_analyzer import ASTAnalyzer
from syntax_fix_generator import SyntaxFixGenerator

def debug_analysis():
    analyzer = ASTAnalyzer()
    fix_generator = SyntaxFixGenerator()
    
    # Test problematic code
    test_code = '''
describe('Test', () => {
  it('should work', () => {
    setSystemTime(new Date(2023, 0, 1);  // Missing closing parenthesis
  });
});
'''
    
    print("=== DEBUGGING AST ANALYSIS ===")
    print("Test code:")
    print(test_code)
    print()
    
    # Analyze
    analysis = analyzer.analyze_with_content('test.tsx', test_code)
    
    print(f"Analysis Results:")
    print(f"  Is valid: {analysis.is_valid}")
    print(f"  File type: {analysis.file_type}")
    print(f"  Syntax errors: {len(analysis.syntax_errors)}")
    print(f"  AST nodes: {len(analysis.ast_nodes)}")
    print()
    
    if analysis.syntax_errors:
        print("Syntax Errors:")
        for i, error in enumerate(analysis.syntax_errors):
            print(f"  {i+1}. Line {error.line}:{error.column} - {error.message}")
            print(f"     Code: {error.error_code}, Source: {error.source}")
        print()
    
    # Generate fixes
    print("=== GENERATING FIXES ===")
    fixes = fix_generator.generate_fixes(analysis, test_code)
    print(f"Generated fixes: {len(fixes)}")
    
    if fixes:
        print("Fixes:")
        for i, fix in enumerate(fixes):
            print(f"  {i+1}. Type: {fix.fix_type}")
            print(f"     Description: {fix.description}")
            print(f"     Confidence: {fix.confidence}")
            print(f"     Line: {fix.line}")
            print(f"     Column: {fix.column}")
        print()
    
    # Apply fixes
    result = fix_generator.apply_fixes(test_code, fixes)
    print(f"Fix Result:")
    print(f"  Success: {result.success}")
    print(f"  Fixes applied: {len(result.fixes_applied)}")
    print(f"  Confidence: {result.confidence}")
    print()
    
    if result.fixed_content != test_code:
        print("Fixed content:")
        print(result.fixed_content)
    else:
        print("No changes made to content")

if __name__ == "__main__":
    debug_analysis()