#!/usr/bin/env python3
"""
Syntax Fix Generator Module for Next-Generation Auto-Fixer
Phase 1: AST Integration

This module generates syntax fixes based on AST analysis results,
handling complex syntax errors that pattern-based approaches cannot fix.
"""

import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import logging

from ast_analyzer import ASTAnalysis, SyntaxError as ASTSyntaxError

logger = logging.getLogger(__name__)

@dataclass
class SyntaxFix:
    """Represents a syntax fix to be applied"""
    line: int
    column: int
    old_text: str
    new_text: str
    description: str
    confidence: float  # 0.0 to 1.0
    fix_type: str  # 'parentheses', 'semicolon', 'bracket', 'call_completion', etc.

@dataclass
class FixResult:
    """Result of applying syntax fixes"""
    success: bool
    fixed_content: str
    fixes_applied: List[SyntaxFix]
    errors_remaining: List[ASTSyntaxError]
    confidence: float

class SyntaxFixGenerator:
    """Generates syntax fixes based on AST analysis"""
    
    def __init__(self):
        self.fix_patterns = self._initialize_fix_patterns()
    
    def _initialize_fix_patterns(self) -> Dict[str, Dict]:
        """Initialize fix patterns for different syntax error types"""
        return {
            'UNMATCHED_PAREN': {
                'description': 'Fix unmatched parentheses',
                'confidence': 0.9,
                'fix_type': 'parentheses'
            },
            'INCOMPLETE_CALL': {
                'description': 'Complete incomplete function calls',
                'confidence': 0.95,
                'fix_type': 'call_completion'
            },
            'MALFORMED_TIMEOUT': {
                'description': 'Fix malformed setTimeout patterns',
                'confidence': 0.85,
                'fix_type': 'async_pattern'
            },
            'MISSING_SEMICOLON': {
                'description': 'Add missing semicolons',
                'confidence': 0.8,
                'fix_type': 'semicolon'
            },
            'UNMATCHED_BRACKET': {
                'description': 'Fix unmatched brackets',
                'confidence': 0.9,
                'fix_type': 'bracket'
            }
        }
    
    def generate_fixes(self, analysis: ASTAnalysis, content: str) -> List[SyntaxFix]:
        """Generate syntax fixes based on AST analysis"""
        fixes = []
        lines = content.split('\n')
        
        for error in analysis.syntax_errors:
            if error.source == 'ast':
                fix = self._generate_fix_for_error(error, lines, content)
                if fix:
                    fixes.append(fix)
        
        # Sort fixes by line number (descending) to apply from bottom up
        # This prevents line number shifts from affecting subsequent fixes
        fixes.sort(key=lambda x: (x.line, x.column), reverse=True)
        
        return fixes
    
    def _generate_fix_for_error(self, error: ASTSyntaxError, lines: List[str], content: str) -> Optional[SyntaxFix]:
        """Generate a specific fix for an AST syntax error"""
        error_code = error.error_code
        line_num = error.line
        
        if line_num > len(lines):
            return None
        
        line = lines[line_num - 1]  # Convert to 0-based index
        
        if error_code == 'UNMATCHED_PAREN':
            return self._fix_unmatched_parentheses(error, line, line_num)
        elif error_code == 'INCOMPLETE_CALL':
            return self._fix_incomplete_call(error, line, line_num)
        elif error_code == 'MALFORMED_TIMEOUT':
            return self._fix_malformed_timeout(error, line, line_num)
        elif error_code == 'PARSE_ERROR' or error_code == 'PARSE_FAILED':
            return self._fix_general_parse_error(error, line, line_num)
        
        return None
    
    def _fix_unmatched_parentheses(self, error: ASTSyntaxError, line: str, line_num: int) -> Optional[SyntaxFix]:
        """Fix unmatched parentheses in function calls"""
        pattern_info = self.fix_patterns['UNMATCHED_PAREN']
        
        # Count parentheses
        open_parens = line.count('(')
        close_parens = line.count(')')
        
        if open_parens > close_parens:
            # Missing closing parentheses
            missing_parens = open_parens - close_parens
            
            # Find where to add closing parentheses
            if line.rstrip().endswith(';'):
                # Add before semicolon
                new_line = line.rstrip()[:-1] + ')' * missing_parens + ';'
            else:
                # Add at end of line
                new_line = line.rstrip() + ')' * missing_parens
            
            return SyntaxFix(
                line=line_num,
                column=len(line.rstrip()) + 1,
                old_text=line.rstrip(),
                new_text=new_line,
                description=f"{pattern_info['description']} - add {missing_parens} closing paren(s)",
                confidence=pattern_info['confidence'],
                fix_type=pattern_info['fix_type']
            )
        
        elif close_parens > open_parens:
            # Extra closing parentheses - remove excess
            excess_parens = close_parens - open_parens
            new_line = line
            for _ in range(excess_parens):
                # Remove last occurrence of ')'
                last_paren = new_line.rfind(')')
                if last_paren != -1:
                    new_line = new_line[:last_paren] + new_line[last_paren + 1:]
            
            return SyntaxFix(
                line=line_num,
                column=1,
                old_text=line.rstrip(),
                new_text=new_line.rstrip(),
                description=f"{pattern_info['description']} - remove {excess_parens} extra paren(s)",
                confidence=pattern_info['confidence'] * 0.8,  # Lower confidence for removal
                fix_type=pattern_info['fix_type']
            )
        
        return None
    
    def _fix_incomplete_call(self, error: ASTSyntaxError, line: str, line_num: int) -> Optional[SyntaxFix]:
        """Fix incomplete function calls like setSystemTime"""
        pattern_info = self.fix_patterns['INCOMPLETE_CALL']
        
        # Look for specific patterns
        if 'setSystemTime(' in line:
            # Pattern: setSystemTime(new Date(...); -> setSystemTime(new Date(...));
            if ';' in line and not line.strip().endswith(');'):
                # Find position of semicolon
                semicolon_pos = line.index(';')
                # Insert closing parenthesis before semicolon
                new_line = line[:semicolon_pos] + ')' + line[semicolon_pos:]
                
                return SyntaxFix(
                    line=line_num,
                    column=semicolon_pos + 1,
                    old_text=line.rstrip(),
                    new_text=new_line.rstrip(),
                    description=f"{pattern_info['description']} - complete setSystemTime call",
                    confidence=pattern_info['confidence'],
                    fix_type=pattern_info['fix_type']
                )
        
        # General incomplete call detection
        function_patterns = ['expect(', 'render(', 'waitFor(', 'screen.getBy']
        for pattern in function_patterns:
            if pattern in line:
                open_parens = line.count('(', line.index(pattern))
                close_parens = line.count(')', line.index(pattern))
                
                if open_parens > close_parens:
                    missing_parens = open_parens - close_parens
                    new_line = line.rstrip() + ')' * missing_parens
                    
                    return SyntaxFix(
                        line=line_num,
                        column=len(line.rstrip()) + 1,
                        old_text=line.rstrip(),
                        new_text=new_line,
                        description=f"{pattern_info['description']} - complete {pattern} call",
                        confidence=pattern_info['confidence'] * 0.9,
                        fix_type=pattern_info['fix_type']
                    )
        
        return None
    
    def _fix_malformed_timeout(self, error: ASTSyntaxError, line: str, line_num: int) -> Optional[SyntaxFix]:
        """Fix malformed setTimeout patterns"""
        pattern_info = self.fix_patterns['MALFORMED_TIMEOUT']
        
        # Pattern: setTimeout((); => { -> setTimeout(() => {
        if 'setTimeout((' in line and ';' in line:
            # Replace setTimeout((; with setTimeout(()
            new_line = line.replace('setTimeout((;', 'setTimeout(()')
            
            return SyntaxFix(
                line=line_num,
                column=line.index('setTimeout(') + 1,
                old_text=line.rstrip(),
                new_text=new_line.rstrip(),
                description=f"{pattern_info['description']} - fix arrow function syntax",
                confidence=pattern_info['confidence'],
                fix_type=pattern_info['fix_type']
            )
        
        # Pattern: setTimeout(() => => { -> setTimeout(() => {
        if 'setTimeout(() =>' in line and '=>' in line:
            parts = line.split('=>')
            if len(parts) > 2:  # Multiple '=>' found
                # Keep only first '=>'
                new_line = parts[0] + '=>' + ''.join(parts[2:])
                
                return SyntaxFix(
                    line=line_num,
                    column=line.index('setTimeout(') + 1,
                    old_text=line.rstrip(),
                    new_text=new_line.rstrip(),
                    description=f"{pattern_info['description']} - remove duplicate arrow function",
                    confidence=pattern_info['confidence'] * 0.8,
                    fix_type=pattern_info['fix_type']
                )
        
        return None
    
    def _fix_general_parse_error(self, error: ASTSyntaxError, line: str, line_num: int) -> Optional[SyntaxFix]:
        """Attempt to fix general parse errors"""
        # Look for common patterns that cause parse errors
        
        # Missing semicolon at end of statement
        if not line.strip().endswith((';', '{', '}', ')', ']')) and line.strip():
            # Check if it looks like a statement that should end with semicolon
            statement_patterns = ['const ', 'let ', 'var ', 'return ', 'throw ', 'import ']
            if any(line.strip().startswith(pattern) for pattern in statement_patterns):
                new_line = line.rstrip() + ';'
                
                return SyntaxFix(
                    line=line_num,
                    column=len(line.rstrip()) + 1,
                    old_text=line.rstrip(),
                    new_text=new_line,
                    description="Add missing semicolon",
                    confidence=0.7,
                    fix_type='semicolon'
                )
        
        return None
    
    def apply_fixes(self, content: str, fixes: List[SyntaxFix]) -> FixResult:
        """Apply syntax fixes to content"""
        if not fixes:
            return FixResult(
                success=True,
                fixed_content=content,
                fixes_applied=[],
                errors_remaining=[],
                confidence=1.0
            )
        
        lines = content.split('\n')
        fixes_applied = []
        
        # Apply fixes in reverse line order to prevent line number shifts
        for fix in fixes:
            if fix.line <= len(lines):
                line_index = fix.line - 1
                old_line = lines[line_index]
                
                # Apply the fix
                lines[line_index] = fix.new_text
                fixes_applied.append(fix)
                
                logger.info(f"Applied fix at line {fix.line}: {fix.description}")
        
        fixed_content = '\n'.join(lines)
        
        # Calculate overall confidence
        if fixes_applied:
            overall_confidence = sum(fix.confidence for fix in fixes_applied) / len(fixes_applied)
        else:
            overall_confidence = 1.0
        
        return FixResult(
            success=len(fixes_applied) > 0,
            fixed_content=fixed_content,
            fixes_applied=fixes_applied,
            errors_remaining=[],  # Would need re-analysis to determine
            confidence=overall_confidence
        )
    
    def fix_content(self, analysis: ASTAnalysis, content: str) -> FixResult:
        """Main method to fix content based on AST analysis"""
        fixes = self.generate_fixes(analysis, content)
        return self.apply_fixes(content, fixes)

def main():
    """Test the syntax fix generator"""
    from ast_analyzer import ASTAnalyzer
    
    # Test content with syntax errors
    test_content = '''
import React from 'react';
import { render, screen } from '@testing-library/react';

describe('Test', () => {
  it('should work', () => {
    expect(screen.getByText('test')).toBeInTheDocument();
    setSystemTime(new Date(2023, 0, 1);
    setTimeout(();
  });
});
'''
    
    analyzer = ASTAnalyzer()
    fix_generator = SyntaxFixGenerator()
    
    # Analyze content
    analysis = analyzer.analyze_with_content('test.tsx', test_content)
    
    print(f"Found {len(analysis.syntax_errors)} syntax errors")
    for error in analysis.syntax_errors:
        print(f"  Line {error.line}: {error.message}")
    
    # Generate and apply fixes
    fix_result = fix_generator.fix_content(analysis, test_content)
    
    print(f"\nApplied {len(fix_result.fixes_applied)} fixes")
    for fix in fix_result.fixes_applied:
        print(f"  Line {fix.line}: {fix.description}")
    
    print(f"\nFixed content:")
    print(fix_result.fixed_content)

if __name__ == "__main__":
    main()