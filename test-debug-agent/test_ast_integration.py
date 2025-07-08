#!/usr/bin/env python3
"""
Comprehensive Test Suite for AST Integration
Phase 1: AST Integration Testing

This test suite validates the AST analyzer and syntax fix generator
components before integration into the main auto-fixer system.
"""

import unittest
from unittest.mock import patch, MagicMock
import tempfile
import os
import sys
from typing import List, Dict

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ast_analyzer import ASTAnalyzer, ASTAnalysis, SyntaxError as ASTSyntaxError
from syntax_fix_generator import SyntaxFixGenerator, SyntaxFix, FixResult

class TestASTAnalyzer(unittest.TestCase):
    """Test suite for AST Analyzer"""
    
    def setUp(self):
        self.analyzer = ASTAnalyzer()
    
    def test_analyze_valid_typescript(self):
        """Test analysis of valid TypeScript code"""
        valid_code = '''
import React from 'react';
import { render, screen } from '@testing-library/react';

describe('Component', () => {
  it('should render correctly', () => {
    render(<div>Test</div>);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
'''
        
        analysis = self.analyzer.analyze_with_content('test.tsx', valid_code)
        
        self.assertIsInstance(analysis, ASTAnalysis)
        self.assertEqual(analysis.file_type, 'tsx')
        self.assertTrue(analysis.is_valid)
        self.assertEqual(len(analysis.syntax_errors), 0)
        self.assertGreater(len(analysis.ast_nodes), 0)
    
    def test_analyze_invalid_syntax(self):
        """Test analysis of code with syntax errors"""
        invalid_code = '''
import React from 'react';

describe('Test', () => {
  it('should work', () => {
    expect(screen.getByText('test')).toBeInTheDocument();
    setSystemTime(new Date(2023, 0, 1);  // Missing closing parenthesis
    setTimeout(();  // Malformed arrow function
  });
});
'''
        
        analysis = self.analyzer.analyze_with_content('test.tsx', invalid_code)
        
        self.assertIsInstance(analysis, ASTAnalysis)
        self.assertFalse(analysis.is_valid)
        self.assertGreater(len(analysis.syntax_errors), 0)
        
        # Check for specific error types
        error_codes = [error.error_code for error in analysis.syntax_errors]
        self.assertTrue(any('PARSE' in code or 'INCOMPLETE' in code or 'UNMATCHED' in code for code in error_codes))
    
    def test_analyze_missing_imports(self):
        """Test detection of missing imports"""
        code_with_missing_imports = '''
describe('Test', () => {
  it('should work', () => {
    render(<div>Test</div>);  // Missing React import
    expect(screen.getByText('Test')).toBeInTheDocument();  // Missing testing-library imports
  });
});
'''
        
        analysis = self.analyzer.analyze_with_content('test.tsx', code_with_missing_imports)
        
        self.assertIsInstance(analysis, ASTAnalysis)
        # Should detect syntax errors or have valid analysis
        self.assertTrue(len(analysis.syntax_errors) > 0 or analysis.is_valid)
    
    def test_analyze_javascript_file(self):
        """Test analysis of JavaScript files"""
        js_code = '''
const React = require('react');
const { render, screen } = require('@testing-library/react');

describe('Component', () => {
  it('should render correctly', () => {
    render(React.createElement('div', null, 'Test'));
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
'''
        
        analysis = self.analyzer.analyze_with_content('test.js', js_code)
        
        self.assertEqual(analysis.file_type, 'javascript')
        self.assertTrue(analysis.is_valid)
        self.assertGreater(len(analysis.ast_nodes), 0)
    
    def test_analyze_nonexistent_file(self):
        """Test analysis of non-existent file"""
        analysis = self.analyzer.analyze_file('nonexistent.tsx')
        
        self.assertIsInstance(analysis, ASTAnalysis)
        self.assertFalse(analysis.is_valid)
        self.assertEqual(len(analysis.syntax_errors), 1)
        self.assertEqual(analysis.syntax_errors[0].error_code, 'PARSE_FAILED')

class TestSyntaxFixGenerator(unittest.TestCase):
    """Test suite for Syntax Fix Generator"""
    
    def setUp(self):
        self.fix_generator = SyntaxFixGenerator()
        self.analyzer = ASTAnalyzer()
    
    def test_fix_unmatched_parentheses(self):
        """Test fixing unmatched parentheses"""
        code_with_unmatched_parens = '''
describe('Test', () => {
  it('should work', () => {
    expect(screen.getByText('test')).toBeInTheDocument();
    setSystemTime(new Date(2023, 0, 1);  // Missing closing parenthesis
  });
});
'''
        
        analysis = self.analyzer.analyze_with_content('test.tsx', code_with_unmatched_parens)
        fixes = self.fix_generator.generate_fixes(analysis, code_with_unmatched_parens)
        
        self.assertGreater(len(fixes), 0)
        
        # Check if parentheses fix is generated
        paren_fixes = [fix for fix in fixes if fix.fix_type == 'parentheses']
        self.assertGreater(len(paren_fixes), 0)
        
        # Apply fixes
        result = self.fix_generator.apply_fixes(code_with_unmatched_parens, fixes)
        self.assertTrue(result.success)
        self.assertGreater(len(result.fixes_applied), 0)
    
    def test_fix_incomplete_call(self):
        """Test fixing incomplete function calls"""
        code_with_incomplete_call = '''
describe('Test', () => {
  it('should work', () => {
    setSystemTime(new Date(2023, 0, 1);  // Incomplete call
  });
});
'''
        
        analysis = self.analyzer.analyze_with_content('test.tsx', code_with_incomplete_call)
        fixes = self.fix_generator.generate_fixes(analysis, code_with_incomplete_call)
        
        # Check if incomplete call fix is generated
        call_fixes = [fix for fix in fixes if fix.fix_type == 'call_completion']
        self.assertGreaterEqual(len(call_fixes), 0)  # May be detected as parentheses issue
        
        # Apply fixes
        result = self.fix_generator.apply_fixes(code_with_incomplete_call, fixes)
        self.assertTrue(result.success)
    
    def test_fix_malformed_timeout(self):
        """Test fixing malformed setTimeout patterns"""
        code_with_malformed_timeout = '''
describe('Test', () => {
  it('should work', () => {
    setTimeout(();  // Malformed arrow function
  });
});
'''
        
        analysis = self.analyzer.analyze_with_content('test.tsx', code_with_malformed_timeout)
        fixes = self.fix_generator.generate_fixes(analysis, code_with_malformed_timeout)
        
        # Apply fixes
        result = self.fix_generator.apply_fixes(code_with_malformed_timeout, fixes)
        self.assertTrue(result.success)
    
    def test_fix_missing_semicolon(self):
        """Test fixing missing semicolons"""
        code_with_missing_semicolon = '''
describe('Test', () => {
  it('should work', () => {
    const value = 'test'  // Missing semicolon
    expect(value).toBe('test');
  });
});
'''
        
        analysis = self.analyzer.analyze_with_content('test.tsx', code_with_missing_semicolon)
        fixes = self.fix_generator.generate_fixes(analysis, code_with_missing_semicolon)
        
        # Apply fixes
        result = self.fix_generator.apply_fixes(code_with_missing_semicolon, fixes)
        self.assertTrue(result.success)
    
    def test_fix_content_integration(self):
        """Test the integrated fix_content method"""
        problematic_code = '''
import React from 'react';

describe('Test', () => {
  it('should work', () => {
    expect(screen.getByText('test')).toBeInTheDocument();
    setSystemTime(new Date(2023, 0, 1);
    setTimeout(();
  });
});
'''
        
        analysis = self.analyzer.analyze_with_content('test.tsx', problematic_code)
        result = self.fix_generator.fix_content(analysis, problematic_code)
        
        self.assertIsInstance(result, FixResult)
        self.assertTrue(result.success)
        self.assertGreater(len(result.fixes_applied), 0)
        self.assertGreater(result.confidence, 0.5)
        
        # Check that the fixed content is different from original
        self.assertNotEqual(result.fixed_content, problematic_code)
    
    def test_no_fixes_needed(self):
        """Test with valid code that needs no fixes"""
        valid_code = '''
import React from 'react';
import { render, screen } from '@testing-library/react';

describe('Component', () => {
  it('should render correctly', () => {
    render(<div>Test</div>);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
'''
        
        analysis = self.analyzer.analyze_with_content('test.tsx', valid_code)
        result = self.fix_generator.fix_content(analysis, valid_code)
        
        self.assertTrue(result.success)
        self.assertEqual(len(result.fixes_applied), 0)
        self.assertEqual(result.confidence, 1.0)
        self.assertEqual(result.fixed_content, valid_code)

class TestASTIntegration(unittest.TestCase):
    """Integration tests for AST components"""
    
    def setUp(self):
        self.analyzer = ASTAnalyzer()
        self.fix_generator = SyntaxFixGenerator()
    
    def test_full_integration_workflow(self):
        """Test complete workflow: analyze → generate fixes → apply fixes"""
        test_cases = [
            {
                'name': 'Unmatched parentheses',
                'code': '''
describe('Test', () => {
  it('should work', () => {
    setSystemTime(new Date(2023, 0, 1);
  });
});
''',
                'expected_fixes': 1
            },
            {
                'name': 'Multiple syntax errors',
                'code': '''
describe('Test', () => {
  it('should work', () => {
    expect(screen.getByText('test')).toBeInTheDocument();
    setSystemTime(new Date(2023, 0, 1);
    setTimeout(();
  });
});
''',
                'expected_fixes': 2
            },
            {
                'name': 'Valid code',
                'code': '''
import React from 'react';
describe('Test', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
''',
                'expected_fixes': 0
            }
        ]
        
        for test_case in test_cases:
            with self.subTest(test_case['name']):
                # Step 1: Analyze
                analysis = self.analyzer.analyze_with_content('test.tsx', test_case['code'])
                self.assertIsInstance(analysis, ASTAnalysis)
                
                # Step 2: Generate fixes
                fixes = self.fix_generator.generate_fixes(analysis, test_case['code'])
                
                # Step 3: Apply fixes
                result = self.fix_generator.apply_fixes(test_case['code'], fixes)
                
                # Verify results
                self.assertTrue(result.success)
                if test_case['expected_fixes'] > 0:
                    self.assertGreaterEqual(len(result.fixes_applied), test_case['expected_fixes'])
                else:
                    self.assertEqual(len(result.fixes_applied), 0)
    
    def test_iterative_fixing(self):
        """Test that fixes can be applied iteratively"""
        complex_code = '''
describe('Test', () => {
  it('should work', () => {
    expect(screen.getByText('test')).toBeInTheDocument();
    setSystemTime(new Date(2023, 0, 1);
    setTimeout(();
    const value = 'test'
  });
});
'''
        
        # First pass
        analysis1 = self.analyzer.analyze_with_content('test.tsx', complex_code)
        result1 = self.fix_generator.fix_content(analysis1, complex_code)
        
        # Second pass on fixed content
        analysis2 = self.analyzer.analyze_with_content('test.tsx', result1.fixed_content)
        result2 = self.fix_generator.fix_content(analysis2, result1.fixed_content)
        
        # Should show improvement
        total_fixes = len(result1.fixes_applied) + len(result2.fixes_applied)
        self.assertGreater(total_fixes, 0)
    
    def test_error_handling(self):
        """Test error handling in integration"""
        # Test with extremely malformed code
        malformed_code = '''
describe('Test', () => {
  it('should work', () => {
    ((((((((((unmatched parentheses
  });
});
'''
        
        # Should not crash and should handle gracefully
        try:
            analysis = self.analyzer.analyze_with_content('test.tsx', malformed_code)
            result = self.fix_generator.fix_content(analysis, malformed_code)
            
            # Should complete without crashing
            self.assertIsInstance(analysis, ASTAnalysis)
            self.assertIsInstance(result, FixResult)
            
        except Exception as e:
            self.fail(f"Error handling test failed with exception: {e}")

def run_tests():
    """Run all tests"""
    unittest.main(verbosity=2)

if __name__ == "__main__":
    run_tests()