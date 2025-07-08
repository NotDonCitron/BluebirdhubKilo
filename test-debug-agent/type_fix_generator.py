#!/usr/bin/env python3
"""
Type Fix Generator Module for Next-Generation Auto-Fixer
Phase 2: TypeScript Integration - Type Fix Generator

This module generates TypeScript-related fixes including type annotations,
interface alignment, import optimization, and type assertion improvements.
"""

import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import logging

from typescript_analyzer import TypeScriptAnalyzer, TypeAnalysis, TypeDiagnostic

logger = logging.getLogger(__name__)

@dataclass
class TypeFix:
    """Represents a TypeScript-related fix"""
    line: int
    column: int
    fix_type: str
    old_text: str
    new_text: str
    description: str
    confidence: float
    type_info: Optional[str] = None

@dataclass
class TypeFixResult:
    """Result of applying type fixes"""
    success: bool
    fixes_applied: List[TypeFix]
    fixed_content: str
    remaining_diagnostics: List[TypeDiagnostic]
    confidence: float

class TypeFixGenerator:
    """Generates TypeScript-related fixes"""
    
    def __init__(self, project_root: str = None):
        self.ts_analyzer = TypeScriptAnalyzer(project_root)
        
        # Common type mappings for improvements
        self.type_improvements = {
            'any': 'unknown',  # More restrictive than 'any'
            'Object': 'object',
            'Function': '(...args: any[]) => any',
            'Number': 'number',
            'String': 'string',
            'Boolean': 'boolean',
            'Array': 'any[]'
        }
        
        # Common React/Testing type patterns
        self.react_types = {
            'props': 'React.ComponentProps',
            'component': 'React.ComponentType',
            'element': 'React.ReactElement',
            'node': 'React.ReactNode',
            'ref': 'React.RefObject',
            'event': 'React.SyntheticEvent',
            'handler': 'React.EventHandler'
        }
        
        # Testing library type patterns
        self.testing_types = {
            'render_result': 'RenderResult',
            'screen': 'Screen',
            'fireEvent': 'FireEvent',
            'userEvent': 'UserEvent',
            'waitFor': 'WaitForOptions',
            'mock': 'jest.Mock',
            'spy': 'jest.SpyInstance'
        }
    
    def generate_type_fixes(self, file_path: str, content: str) -> List[TypeFix]:
        """Generate type-related fixes for the file"""
        fixes = []
        
        # Analyze TypeScript
        analysis = self.ts_analyzer.analyze_file(file_path)
        
        # Fix type-related diagnostics
        diagnostic_fixes = self._fix_type_diagnostics(analysis.diagnostics, content)
        fixes.extend(diagnostic_fixes)
        
        # Improve type assertions
        assertion_fixes = self._improve_type_assertions(content)
        fixes.extend(assertion_fixes)
        
        # Add missing type annotations
        annotation_fixes = self._add_missing_type_annotations(content, analysis)
        fixes.extend(annotation_fixes)
        
        # Optimize imports
        import_fixes = self._optimize_type_imports(content, analysis)
        fixes.extend(import_fixes)
        
        # Fix mock data types
        mock_fixes = self._fix_mock_data_types(content, analysis)
        fixes.extend(mock_fixes)
        
        # Sort by line number for consistent application
        fixes.sort(key=lambda x: (x.line, x.column))
        
        return fixes
    
    def _fix_type_diagnostics(self, diagnostics: List[TypeDiagnostic], content: str) -> List[TypeFix]:
        """Fix issues identified by TypeScript diagnostics"""
        fixes = []
        lines = content.split('\n')
        
        for diagnostic in diagnostics:
            if diagnostic.line <= len(lines):
                line = lines[diagnostic.line - 1]
                fix = self._create_fix_for_diagnostic(diagnostic, line)
                if fix:
                    fixes.append(fix)
        
        return fixes
    
    def _create_fix_for_diagnostic(self, diagnostic: TypeDiagnostic, line: str) -> Optional[TypeFix]:
        """Create a fix for a specific TypeScript diagnostic"""
        # Common TypeScript error patterns and their fixes
        
        # TS2339: Property does not exist on type
        if diagnostic.code == 2339:
            return self._fix_property_not_exist(diagnostic, line)
        
        # TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'
        elif diagnostic.code == 2345:
            return self._fix_argument_type_mismatch(diagnostic, line)
        
        # TS2322: Type 'X' is not assignable to type 'Y'
        elif diagnostic.code == 2322:
            return self._fix_type_assignment_error(diagnostic, line)
        
        # TS2304: Cannot find name 'X'
        elif diagnostic.code == 2304:
            return self._fix_cannot_find_name(diagnostic, line)
        
        # TS2571: Object is of type 'unknown'
        elif diagnostic.code == 2571:
            return self._fix_unknown_type(diagnostic, line)
        
        # TS7006: Parameter 'X' implicitly has an 'any' type
        elif diagnostic.code == 7006:
            return self._fix_implicit_any_parameter(diagnostic, line)
        
        return None
    
    def _fix_property_not_exist(self, diagnostic: TypeDiagnostic, line: str) -> Optional[TypeFix]:
        """Fix property does not exist errors"""
        # Extract property name from message
        prop_match = re.search(r"Property '([^']+)' does not exist", diagnostic.message)
        if not prop_match:
            return None
        
        property_name = prop_match.group(1)
        
        # Common fixes for testing scenarios
        if 'mockReturnValue' in line or 'mockImplementation' in line:
            # Mock function property - add type assertion
            if 'as any' not in line:
                new_line = line.replace(property_name, f'{property_name} as any')
                return TypeFix(
                    line=diagnostic.line,
                    column=diagnostic.column,
                    fix_type='type_assertion',
                    old_text=line.strip(),
                    new_text=new_line.strip(),
                    description=f"Add type assertion for mock property '{property_name}'",
                    confidence=0.8,
                    type_info='any'
                )
        
        # Screen queries - might need screen import
        elif 'screen.' in line and property_name.startswith('getBy'):
            # Check if it's a valid screen query
            valid_queries = ['getByText', 'getByRole', 'getByLabelText', 'getByPlaceholderText', 
                           'getByAltText', 'getByTitle', 'getByTestId', 'getByDisplayValue']
            if property_name in valid_queries:
                return TypeFix(
                    line=diagnostic.line,
                    column=diagnostic.column,
                    fix_type='import_fix',
                    old_text=line.strip(),
                    new_text=line.strip(),  # No change needed, just import
                    description=f"Valid screen query '{property_name}' - ensure proper imports",
                    confidence=0.9,
                    type_info='screen_query'
                )
        
        return None
    
    def _fix_argument_type_mismatch(self, diagnostic: TypeDiagnostic, line: str) -> Optional[TypeFix]:
        """Fix argument type mismatches"""
        # Look for common patterns
        if 'expect(' in line:
            # Often need to add type assertion for complex matchers
            expect_match = re.search(r'expect\(([^)]+)\)', line)
            if expect_match:
                arg = expect_match.group(1)
                if 'as any' not in arg:
                    new_line = line.replace(arg, f'{arg} as any')
                    return TypeFix(
                        line=diagnostic.line,
                        column=diagnostic.column,
                        fix_type='type_assertion',
                        old_text=line.strip(),
                        new_text=new_line.strip(),
                        description="Add type assertion for expect argument",
                        confidence=0.7,
                        type_info='any'
                    )
        
        return None
    
    def _fix_type_assignment_error(self, diagnostic: TypeDiagnostic, line: str) -> Optional[TypeFix]:
        """Fix type assignment errors"""
        # Common in mock data assignments
        if 'mockReturnValue' in line or 'mockResolvedValue' in line:
            # Add type assertion
            if 'as any' not in line:
                # Find the value being assigned
                value_match = re.search(r'mockR\w+Value\(([^)]+)\)', line)
                if value_match:
                    value = value_match.group(1)
                    new_line = line.replace(value, f'{value} as any')
                    return TypeFix(
                        line=diagnostic.line,
                        column=diagnostic.column,
                        fix_type='type_assertion',
                        old_text=line.strip(),
                        new_text=new_line.strip(),
                        description="Add type assertion for mock return value",
                        confidence=0.8,
                        type_info='any'
                    )
        
        return None
    
    def _fix_cannot_find_name(self, diagnostic: TypeDiagnostic, line: str) -> Optional[TypeFix]:
        """Fix cannot find name errors"""
        # Extract the missing name
        name_match = re.search(r"Cannot find name '([^']+)'", diagnostic.message)
        if not name_match:
            return None
        
        name = name_match.group(1)
        
        # Common missing names in tests
        common_globals = {
            'jest': "import jest from 'jest';",
            'expect': "import { expect } from '@testing-library/jest-dom';",
            'describe': "// describe is a global in Jest",
            'it': "// it is a global in Jest",
            'beforeEach': "// beforeEach is a global in Jest",
            'afterEach': "// afterEach is a global in Jest"
        }
        
        if name in common_globals:
            return TypeFix(
                line=diagnostic.line,
                column=diagnostic.column,
                fix_type='import_fix',
                old_text=line.strip(),
                new_text=line.strip(),
                description=f"Add import for '{name}'",
                confidence=0.9,
                type_info=common_globals[name]
            )
        
        return None
    
    def _fix_unknown_type(self, diagnostic: TypeDiagnostic, line: str) -> Optional[TypeFix]:
        """Fix unknown type errors"""
        # Add type assertion to resolve unknown types
        if 'as any' not in line:
            # Find the object that's unknown
            unknown_match = re.search(r'(\w+)\.', line)
            if unknown_match:
                obj_name = unknown_match.group(1)
                new_line = line.replace(obj_name, f'({obj_name} as any)')
                return TypeFix(
                    line=diagnostic.line,
                    column=diagnostic.column,
                    fix_type='type_assertion',
                    old_text=line.strip(),
                    new_text=new_line.strip(),
                    description=f"Add type assertion for unknown object '{obj_name}'",
                    confidence=0.7,
                    type_info='any'
                )
        
        return None
    
    def _fix_implicit_any_parameter(self, diagnostic: TypeDiagnostic, line: str) -> Optional[TypeFix]:
        """Fix implicit any parameter errors"""
        # Extract parameter name
        param_match = re.search(r"Parameter '([^']+)' implicitly has an 'any' type", diagnostic.message)
        if not param_match:
            return None
        
        param_name = param_match.group(1)
        
        # Add type annotation
        if f'{param_name}:' not in line:
            new_line = line.replace(param_name, f'{param_name}: any')
            return TypeFix(
                line=diagnostic.line,
                column=diagnostic.column,
                fix_type='type_annotation',
                old_text=line.strip(),
                new_text=new_line.strip(),
                description=f"Add type annotation for parameter '{param_name}'",
                confidence=0.8,
                type_info='any'
            )
        
        return None
    
    def _improve_type_assertions(self, content: str) -> List[TypeFix]:
        """Improve type assertions"""
        fixes = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            line_num = i + 1
            
            # Replace 'as any' with more specific types where possible
            if 'as any' in line:
                # Context-aware type improvement
                new_line = line
                improved = False
                
                # Mock functions
                if 'mock' in line.lower():
                    new_line = line.replace('as any', 'as jest.Mock')
                    improved = True
                
                # React components
                elif 'render(' in line or 'component' in line.lower():
                    new_line = line.replace('as any', 'as React.ComponentType')
                    improved = True
                
                # Event handlers
                elif 'event' in line.lower() or 'handler' in line.lower():
                    new_line = line.replace('as any', 'as React.SyntheticEvent')
                    improved = True
                
                if improved:
                    fixes.append(TypeFix(
                        line=line_num,
                        column=line.find('as any') + 1,
                        fix_type='type_assertion_improvement',
                        old_text=line.strip(),
                        new_text=new_line.strip(),
                        description="Improve type assertion from 'any' to more specific type",
                        confidence=0.8
                    ))
        
        return fixes
    
    def _add_missing_type_annotations(self, content: str, analysis: TypeAnalysis) -> List[TypeFix]:
        """Add missing type annotations"""
        fixes = []
        lines = content.split('\n')
        
        # Look for variables that could benefit from type annotations
        for i, line in enumerate(lines):
            line_num = i + 1
            
            # Mock data without type annotation
            if 'const mock' in line and ':' not in line.split('=')[0]:
                var_match = re.search(r'const\s+(\w+)\s*=', line)
                if var_match:
                    var_name = var_match.group(1)
                    # Suggest type based on context
                    if 'user' in var_name.lower():
                        suggested_type = 'User'
                    elif 'data' in var_name.lower():
                        suggested_type = 'any[]'
                    elif 'response' in var_name.lower():
                        suggested_type = 'ApiResponse'
                    else:
                        suggested_type = 'any'
                    
                    new_line = line.replace(f'const {var_name}', f'const {var_name}: {suggested_type}')
                    fixes.append(TypeFix(
                        line=line_num,
                        column=line.find(var_name) + 1,
                        fix_type='type_annotation',
                        old_text=line.strip(),
                        new_text=new_line.strip(),
                        description=f"Add type annotation for variable '{var_name}'",
                        confidence=0.7,
                        type_info=suggested_type
                    ))
        
        return fixes
    
    def _optimize_type_imports(self, content: str, analysis: TypeAnalysis) -> List[TypeFix]:
        """Optimize type imports"""
        fixes = []
        lines = content.split('\n')
        
        # Check for missing common type imports
        has_react_import = any('from \'react\'' in line for line in lines)
        has_testing_import = any('@testing-library' in line for line in lines)
        
        # Add React types if needed
        if not has_react_import and any('React.' in line for line in lines):
            fixes.append(TypeFix(
                line=1,
                column=1,
                fix_type='import_addition',
                old_text='',
                new_text='import React from \'react\';',
                description="Add React import for type annotations",
                confidence=0.9,
                type_info='react'
            ))
        
        # Add Jest types if needed
        if 'jest.Mock' in content and not any('jest' in line for line in lines):
            fixes.append(TypeFix(
                line=1,
                column=1,
                fix_type='import_addition',
                old_text='',
                new_text='import type { Jest } from \'@jest/types\';',
                description="Add Jest type import",
                confidence=0.9,
                type_info='jest'
            ))
        
        return fixes
    
    def _fix_mock_data_types(self, content: str, analysis: TypeAnalysis) -> List[TypeFix]:
        """Fix mock data type issues"""
        fixes = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            line_num = i + 1
            
            # Mock data with object spread
            if 'mockReturnValue({' in line and 'as any' not in line:
                # Add type assertion for mock data
                new_line = line.replace('mockReturnValue({', 'mockReturnValue({')
                # Find the end of the object
                if '})' in line:
                    new_line = line.replace('})', '} as any)')
                    fixes.append(TypeFix(
                        line=line_num,
                        column=line.find('mockReturnValue') + 1,
                        fix_type='type_assertion',
                        old_text=line.strip(),
                        new_text=new_line.strip(),
                        description="Add type assertion for mock return value",
                        confidence=0.8,
                        type_info='any'
                    ))
        
        return fixes
    
    def apply_type_fixes(self, content: str, fixes: List[TypeFix]) -> TypeFixResult:
        """Apply type fixes to content"""
        if not fixes:
            return TypeFixResult(
                success=True,
                fixes_applied=[],
                fixed_content=content,
                remaining_diagnostics=[],
                confidence=1.0
            )
        
        lines = content.split('\n')
        applied_fixes = []
        
        # Group fixes by type for better application order
        import_fixes = [f for f in fixes if f.fix_type == 'import_addition']
        other_fixes = [f for f in fixes if f.fix_type != 'import_addition']
        
        # Apply import fixes first (at the beginning)
        for fix in import_fixes:
            if fix.new_text:
                lines.insert(0, fix.new_text)
                applied_fixes.append(fix)
        
        # Apply other fixes in reverse line order
        other_fixes.sort(key=lambda x: x.line, reverse=True)
        for fix in other_fixes:
            if fix.line <= len(lines):
                lines[fix.line - 1] = fix.new_text
                applied_fixes.append(fix)
        
        fixed_content = '\n'.join(lines)
        
        # Calculate confidence
        if applied_fixes:
            confidence = sum(f.confidence for f in applied_fixes) / len(applied_fixes)
        else:
            confidence = 1.0
        
        return TypeFixResult(
            success=len(applied_fixes) > 0,
            fixes_applied=applied_fixes,
            fixed_content=fixed_content,
            remaining_diagnostics=[],  # Would need re-analysis
            confidence=confidence
        )
    
    def fix_file_types(self, file_path: str, content: str) -> TypeFixResult:
        """Complete workflow to fix TypeScript issues in file"""
        fixes = self.generate_type_fixes(file_path, content)
        result = self.apply_type_fixes(content, fixes)
        
        logger.info(f"Applied {len(result.fixes_applied)} type fixes to {file_path}")
        
        return result

def main():
    """Test the type fix generator"""
    generator = TypeFixGenerator()
    
    # Test content with TypeScript issues
    test_content = '''
import { render, screen } from '@testing-library/react';

describe('Component', () => {
  it('should work', () => {
    const mockData = {
      id: 1,
      name: 'test'
    };
    
    const mockFn = jest.fn().mockReturnValue(mockData);
    
    render(<Component data={mockData as any} />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
'''
    
    print("=== TESTING TYPE FIX GENERATOR ===")
    print("Original content:")
    print(test_content)
    print("\n" + "="*50 + "\n")
    
    result = generator.fix_file_types('test.tsx', test_content)
    
    if result.success:
        print(f"Applied {len(result.fixes_applied)} type fixes:")
        for fix in result.fixes_applied:
            print(f"  Line {fix.line}: {fix.description} (confidence: {fix.confidence:.2f})")
        
        print(f"\nOverall confidence: {result.confidence:.2f}")
        print("\nFixed content:")
        print(result.fixed_content)
    else:
        print("No type fixes applied")

if __name__ == "__main__":
    main()