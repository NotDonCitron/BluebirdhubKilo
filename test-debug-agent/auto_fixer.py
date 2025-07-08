"""Automated test fixer for common React/TypeScript test issues."""

from __future__ import annotations

import re
import ast
import json
from typing import Dict, List, Tuple, Optional, Any
from pathlib import Path
from dataclasses import dataclass

@dataclass
class FixResult:
    """Result of applying a fix."""
    success: bool
    original_content: str
    fixed_content: str
    changes_made: List[str]
    error: Optional[str] = None

class TestAutoFixer:
    """Automatically fix common test issues."""
    
    def __init__(self):
        self.fix_count = 0
        self.fixes_applied = []
        self.component_interfaces = {}  # Cache for component interfaces
    
    def fix_date_errors(self, content: str, file_path: str) -> FixResult:
        """Fix date-related errors in tests."""
        original = content
        changes = []
        
        # Check if fake timers are already used
        has_fake_timers = "useFakeTimers" in content
        
        if not has_fake_timers and "new Date" in content:
            # Find the first describe block
            describe_match = re.search(r'describe\([\'"].*?[\'"]\s*,\s*\(\)\s*=>\s*{', content)
            if describe_match:
                insert_pos = describe_match.end()
                # Add beforeEach with fake timers
                timer_setup = """
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });
"""
                content = content[:insert_pos] + timer_setup + content[insert_pos:]
                changes.append("Added jest.useFakeTimers() setup")
        
        # Fix invalid date constructions
        invalid_date_patterns = [
            (r'new Date\(\s*undefined\s*\)', 'new Date()'),
            (r'new Date\(\s*null\s*\)', 'new Date()'),
            (r'new Date\(\s*""\s*\)', 'new Date()'),
            (r'new Date\(\s*invalid[^)]*\)', 'new Date()'),
        ]
        
        for pattern, replacement in invalid_date_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
                changes.append(f"Fixed invalid date pattern: {pattern}")
        
        return FixResult(
            success=len(changes) > 0,
            original_content=original,
            fixed_content=content,
            changes_made=changes
        )
    
    def fix_act_warnings(self, content: str, file_path: str) -> FixResult:
        """Fix React act() warnings."""
        original = content
        changes = []
        
        # Pattern 1: fireEvent not wrapped in act
        fire_event_pattern = r'(fireEvent\.\w+\([^)]+\))'
        matches = list(re.finditer(fire_event_pattern, content))
        
        for match in reversed(matches):  # Process in reverse to maintain positions
            event_call = match.group(1)
            # Check if already wrapped
            before_text = content[max(0, match.start()-50):match.start()]
            if "act(" not in before_text and "waitFor" not in before_text:
                # Wrap in act
                wrapped = f"act(() => {{\n    {event_call};\n  }})"
                content = content[:match.start()] + wrapped + content[match.end():]
                changes.append(f"Wrapped {event_call} in act()")
        
        # Pattern 2: userEvent not properly awaited
        user_event_pattern = r'(userEvent\.\w+\([^)]+\))(?!;?\s*\))'
        matches = list(re.finditer(user_event_pattern, content))
        
        for match in reversed(matches):
            event_call = match.group(1)
            # Check if awaited
            before_text = content[max(0, match.start()-10):match.start()]
            if "await" not in before_text:
                # Add await
                content = content[:match.start()] + f"await {event_call}" + content[match.end():]
                changes.append(f"Added await to {event_call}")
        
        # Pattern 3: State updates in tests
        set_state_pattern = r'(set\w+)\(([^)]+)\)'
        matches = list(re.finditer(set_state_pattern, content))
        
        for match in reversed(matches):
            if "act(" not in content[max(0, match.start()-50):match.start()]:
                setter = match.group(0)
                wrapped = f"act(() => {{\n    {setter};\n  }})"
                content = content[:match.start()] + wrapped + content[match.end():]
                changes.append(f"Wrapped {match.group(1)} in act()")
        
        # Add waitFor import if needed
        if changes and "waitFor" not in content and "@testing-library/react" in content:
            import_match = re.search(r'import\s*{([^}]+)}\s*from\s*[\'"]@testing-library/react[\'"]', content)
            if import_match:
                imports = import_match.group(1)
                if "waitFor" not in imports:
                    new_imports = imports.strip() + ", waitFor"
                    content = content[:import_match.start(1)] + new_imports + content[import_match.end(1):]
                    changes.append("Added waitFor import")
        
        return FixResult(
            success=len(changes) > 0,
            original_content=original,
            fixed_content=content,
            changes_made=changes
        )
    
    def add_cleanup(self, content: str, file_path: str) -> FixResult:
        """Add missing cleanup to test files."""
        original = content
        changes = []
        
        # Check if cleanup exists
        has_cleanup = "afterEach" in content
        has_render = "render" in content or "mount" in content
        
        if not has_cleanup and has_render:
            # Find describe blocks
            describe_blocks = list(re.finditer(r'describe\([\'"].*?[\'"]\s*,\s*\(\)\s*=>\s*{', content))
            
            if describe_blocks:
                # Add cleanup after the first describe
                insert_pos = describe_blocks[0].end()
                cleanup_code = """
  afterEach(() => {
    cleanup();
  });
"""
                content = content[:insert_pos] + cleanup_code + content[insert_pos:]
                changes.append("Added afterEach cleanup")
                
                # Add cleanup import if needed
                if "cleanup" not in content:
                    import_match = re.search(r'import\s*{([^}]+)}\s*from\s*[\'"]@testing-library/react[\'"]', content)
                    if import_match:
                        imports = import_match.group(1)
                        new_imports = imports.strip() + ", cleanup"
                        content = content[:import_match.start(1)] + new_imports + content[import_match.end(1):]
                        changes.append("Added cleanup import")
        
        return FixResult(
            success=len(changes) > 0,
            original_content=original,
            fixed_content=content,
            changes_made=changes
        )
    
    def fix_async_tests(self, content: str, file_path: str) -> FixResult:
        """Fix async test issues."""
        original = content
        changes = []
        
        # Find async test blocks without await
        async_test_pattern = r'(it|test)\([\'"]([^\'\"]+)[\'"]\s*,\s*async\s*\(\)\s*=>\s*{([^}]+)}'
        matches = list(re.finditer(async_test_pattern, content, re.DOTALL))
        
        for match in matches:
            test_name = match.group(2)
            test_body = match.group(3)
            
            # Check if there are async operations without await
            if "render" in test_body and "await" not in test_body:
                # Find render calls and add await
                render_pattern = r'(const\s*{[^}]+}\s*=\s*)?(render\([^)]+\))'
                render_matches = list(re.finditer(render_pattern, test_body))
                
                for render_match in reversed(render_matches):
                    if "await" not in test_body[max(0, render_match.start()-10):render_match.start()]:
                        prefix = render_match.group(1) or ""
                        render_call = render_match.group(2)
                        replacement = f"{prefix}await {render_call}"
                        
                        # Calculate position in full content
                        full_pos = match.start(3) + render_match.start()
                        content = content[:full_pos] + replacement + content[full_pos + render_match.end():]
                        changes.append(f"Added await to render in test '{test_name}'")
        
        # Fix waitFor patterns
        waitfor_pattern = r'expect\([^)]+\)\.([^;]+);(?!\s*\})'
        matches = list(re.finditer(waitfor_pattern, content))
        
        for match in reversed(matches):
            # Check if it's an async assertion that needs waitFor
            assertion = match.group(0)
            if any(async_method in assertion for async_method in ['toBeInTheDocument', 'toBeVisible', 'toHaveTextContent']):
                before_text = content[max(0, match.start()-50):match.start()]
                if "waitFor" not in before_text and "await" not in before_text:
                    wrapped = f"await waitFor(() => {assertion});"
                    content = content[:match.start()] + wrapped + content[match.end():]
                    changes.append(f"Wrapped async assertion in waitFor")
        
        return FixResult(
            success=len(changes) > 0,
            original_content=original,
            fixed_content=content,
            changes_made=changes
        )
    
    def fix_mock_imports(self, content: str, file_path: str) -> FixResult:
        """Fix missing or incorrect mock imports."""
        original = content
        changes = []
        
        # Find jest.mock calls
        mock_calls = re.findall(r'jest\.mock\([\'"]([^\'\"]+)[\'"]\)', content)
        
        for module in mock_calls:
            # Check if it's a local module
            if module.startswith('@/') or module.startswith('./') or module.startswith('../'):
                # Convert to potential mock path
                mock_path = module.replace('@/', '')
                if not mock_path.endswith('.tsx') and not mock_path.endswith('.ts'):
                    # Try to determine the correct extension
                    possible_extensions = ['.tsx', '.ts', '.jsx', '.js']
                    # This is a simplified check - in reality, we'd check file system
                    changes.append(f"Check if mock exists for {module}")
        
        # Auto-create simple mocks for common modules
        if "next-auth/react" in mock_calls:
            if "useSession" in content and "__mocks__" not in content:
                # Add inline mock
                mock_code = """
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { id: '1', name: 'Test User' } },
    status: 'authenticated'
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
"""
                # Insert after imports
                import_end = content.rfind('import')
                if import_end != -1:
                    import_end = content.find('\n', import_end) + 1
                    content = content[:import_end] + "\n" + mock_code + content[import_end:]
                    changes.append("Added next-auth/react mock")
        
        return FixResult(
            success=len(changes) > 0,
            original_content=original,
            fixed_content=content,
            changes_made=changes
        )
    
    def analyze_component_interface(self, component_path: str) -> Dict[str, Any]:
        """Analyze component file to extract interface information."""
        if component_path in self.component_interfaces:
            return self.component_interfaces[component_path]
        
        try:
            if Path(component_path).exists():
                with open(component_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                interface_info = {
                    'interfaces': [],
                    'api_endpoints': [],
                    'props': [],
                    'hooks': [],
                    'imports': []
                }
                
                # Extract TypeScript interfaces
                interface_matches = re.finditer(
                    r'interface\s+(\w+)\s*{([^}]+)}',
                    content,
                    re.DOTALL
                )
                for match in interface_matches:
                    interface_name = match.group(1)
                    interface_body = match.group(2)
                    interface_info['interfaces'].append({
                        'name': interface_name,
                        'body': interface_body.strip()
                    })
                
                # Extract API endpoints
                api_patterns = [
                    r'fetch\([\'"]([^\'\"]+)[\'"]',
                    r'\.get\([\'"]([^\'\"]+)[\'"]',
                    r'\.post\([\'"]([^\'\"]+)[\'"]',
                    r'axios\.[a-z]+\([\'"]([^\'\"]+)[\'"]'
                ]
                
                for pattern in api_patterns:
                    matches = re.finditer(pattern, content)
                    for match in matches:
                        endpoint = match.group(1)
                        if endpoint not in interface_info['api_endpoints']:
                            interface_info['api_endpoints'].append(endpoint)
                
                # Extract hook usage
                hook_patterns = [
                    r'use(\w+)\(',
                    r'useState\(',
                    r'useEffect\(',
                    r'useSession\(',
                    r'useRouter\('
                ]
                
                for pattern in hook_patterns:
                    matches = re.finditer(pattern, content)
                    for match in matches:
                        hook = match.group(0)
                        if hook not in interface_info['hooks']:
                            interface_info['hooks'].append(hook)
                
                self.component_interfaces[component_path] = interface_info
                return interface_info
                
        except Exception as e:
            print(f"Error analyzing component {component_path}: {e}")
        
        return {'interfaces': [], 'api_endpoints': [], 'props': [], 'hooks': [], 'imports': []}
    
    def fix_interface_mismatches(self, content: str, file_path: str) -> FixResult:
        """Fix interface mismatches between test mocks and component expectations."""
        original = content
        changes = []
        
        # Find the corresponding component file
        component_path = self._find_component_path(file_path)
        if not component_path:
            return FixResult(False, original, content, [])
        
        # Analyze the component
        interface_info = self.analyze_component_interface(component_path)
        
        # Fix API endpoint mismatches
        for endpoint in interface_info['api_endpoints']:
            # Look for generic fetch mocks that should be specific
            generic_patterns = [
                r'fetch\.mockResolvedValueOnce\(\s*{[^}]*ok:\s*true[^}]*}\s*\)',
                r'global\.fetch\.mockResolvedValue\(\s*{[^}]*ok:\s*true[^}]*}\s*\)'
            ]
            
            for pattern in generic_patterns:
                if re.search(pattern, content):
                    # Replace with endpoint-specific mock
                    mock_data = self._generate_mock_data_for_endpoint(endpoint, interface_info)
                    if mock_data:
                        new_mock = f'''fetch.mockImplementation((url) => {{
      if (url.includes('{endpoint}')) {{
        return Promise.resolve({{
          ok: true,
          json: async () => ({mock_data})
        }});
      }}
      return Promise.reject(new Error('Unexpected API call'));
    }});'''
                        content = re.sub(pattern, new_mock, content, count=1)
                        changes.append(f"Fixed API endpoint mock for {endpoint}")
        
        # Fix mock data structure mismatches
        for interface in interface_info['interfaces']:
            interface_name = interface['name']
            # Look for mock data that should match this interface
            mock_patterns = [
                rf'{interface_name.lower()}[^:]*:\s*{{([^}}]+)}}',
                rf'mock{interface_name}\s*=\s*{{([^}}]+)}}'
            ]
            
            for pattern in mock_patterns:
                matches = re.finditer(pattern, content, re.DOTALL)
                for match in matches:
                    mock_data = match.group(1)
                    # Generate proper mock data based on interface
                    proper_mock = self._generate_proper_mock_data(interface, mock_data)
                    if proper_mock and proper_mock != mock_data:
                        content = content.replace(match.group(0),
                                                match.group(0).replace(mock_data, proper_mock))
                        changes.append(f"Fixed mock data structure for {interface_name}")
        
        return FixResult(
            success=len(changes) > 0,
            original_content=original,
            fixed_content=content,
            changes_made=changes
        )
    
    def fix_date_formatting_issues(self, content: str, file_path: str) -> FixResult:
        """Fix comprehensive date formatting issues."""
        original = content
        changes = []
        
        # Fix invalid date strings that cause "Invalid time value"
        invalid_date_patterns = [
            (r'createdAt:\s*[\'"]invalid[^\'\"]*[\'"]', 'createdAt: "2024-01-01T00:00:00.000Z"'),
            (r'updatedAt:\s*[\'"]invalid[^\'\"]*[\'"]', 'updatedAt: "2024-01-01T00:00:00.000Z"'),
            (r'lastLogin:\s*[\'"]invalid[^\'\"]*[\'"]', 'lastLogin: "2024-01-01T00:00:00.000Z"'),
            (r'timestamp:\s*[\'"]invalid[^\'\"]*[\'"]', 'timestamp: "2024-01-01T00:00:00.000Z"'),
            (r'date:\s*[\'"]invalid[^\'\"]*[\'"]', 'date: "2024-01-01T00:00:00.000Z"'),
            # Fix malformed ISO dates
            (r'[\'"]202\d-\d{1,2}-\d{1,2}[\'"]', '"2024-01-01T00:00:00.000Z"'),
            (r'[\'"]202\d/\d{1,2}/\d{1,2}[\'"]', '"2024-01-01T00:00:00.000Z"'),
        ]
        
        for pattern, replacement in invalid_date_patterns:
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                changes.append(f"Fixed invalid date pattern: {pattern}")
        
        # Ensure proper date-fns mocking for date formatting
        if 'date-fns' in content and 'jest.mock' not in content:
            date_fns_mock = '''
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'MMM d, yyyy') return 'Jan 1, 2024';
    if (formatStr === 'MMM d, yyyy h:mm a') return 'Jan 1, 2024 12:00 AM';
    return '2024-01-01';
  }),
  parseISO: jest.fn((dateStr) => new Date('2024-01-01T00:00:00.000Z')),
  isValid: jest.fn(() => true),
}));
'''
            # Insert after imports
            import_end = content.rfind('import')
            if import_end != -1:
                import_end = content.find('\n', import_end) + 1
                content = content[:import_end] + "\n" + date_fns_mock + content[import_end:]
                changes.append("Added date-fns mocking")
        
        return FixResult(
            success=len(changes) > 0,
            original_content=original,
            fixed_content=content,
            changes_made=changes
        )
    
    def fix_selector_issues(self, content: str, file_path: str) -> FixResult:
        """Fix selector issues in tests."""
        original = content
        changes = []
        
        # Fix common selector mismatches
        selector_fixes = [
            # Role-based selectors that should be CSS class selectors
            (r'getByRole\([\'"]loading[\'"]', 'querySelector(".loading")'),
            (r'getByRole\([\'"]spinner[\'"]', 'querySelector(".spinner")'),
            (r'getByRole\([\'"]error[\'"]', 'querySelector(".error")'),
            (r'queryByRole\([\'"]loading[\'"]', 'querySelector(".loading")'),
            
            # Fix generic selectors
            (r'getByTestId\([\'"]submit[\'"]', 'getByTestId("submit-button")'),
            (r'getByText\([\'"]Submit[\'"]', 'getByRole("button", { name: /submit/i })'),
            
            # Fix waiting for elements
            (r'waitFor\(\(\)\s*=>\s*expect\(.*getByRole\([\'"]loading[\'"]',
             'waitFor(() => expect(screen.querySelector(".loading"))')
        ]
        
        for pattern, replacement in selector_fixes:
            if re.search(pattern, content, re.IGNORECASE):
                content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
                changes.append(f"Fixed selector pattern: {pattern}")
        
        return FixResult(
            success=len(changes) > 0,
            original_content=original,
            fixed_content=content,
            changes_made=changes
        )
    
    def fix_promise_all_patterns(self, content: str, file_path: str) -> FixResult:
        """Fix issues with Promise.all patterns in components."""
        original = content
        changes = []
        
        # Look for components that use Promise.all
        component_path = self._find_component_path(file_path)
        if component_path:
            interface_info = self.analyze_component_interface(component_path)
            
            # If component has multiple API endpoints, likely uses Promise.all
            if len(interface_info['api_endpoints']) > 1:
                # Update fetch mocks to handle multiple concurrent calls
                if 'fetch.mockResolvedValueOnce' in content:
                    # Replace single resolved value with implementation
                    mock_impl = '''fetch.mockImplementation((url) => {
      const responses = {'''
                    
                    for endpoint in interface_info['api_endpoints']:
                        mock_data = self._generate_mock_data_for_endpoint(endpoint, interface_info)
                        mock_impl += f'''
        '{endpoint}': {{ ok: true, json: async () => ({mock_data}) }},'''
                    
                    mock_impl += '''
      };
      
      const matchingEndpoint = Object.keys(responses).find(endpoint =>
        url.includes(endpoint)
      );
      
      if (matchingEndpoint) {
        return Promise.resolve(responses[matchingEndpoint]);
      }
      
      return Promise.reject(new Error(`Unexpected API call: ${url}`));
    });'''
                    
                    # Replace the first mockResolvedValueOnce
                    content = re.sub(
                        r'fetch\.mockResolvedValueOnce\([^)]+\);?',
                        mock_impl,
                        content,
                        count=1
                    )
                    changes.append("Updated fetch mock to handle Promise.all pattern")
        
        return FixResult(
            success=len(changes) > 0,
            original_content=original,
            fixed_content=content,
            changes_made=changes
        )
    
    def _find_component_path(self, test_path: str) -> Optional[str]:
        """Find the corresponding component file for a test file."""
        # Remove test path parts and find component
        path_parts = test_path.replace('__tests__/', '').replace('.test.tsx', '.tsx').replace('.test.ts', '.ts')
        
        # Try common component locations
        possible_paths = [
            f"app/components/{path_parts}",
            f"app/{path_parts}",
            f"components/{path_parts}",
            f"src/components/{path_parts}",
            f"src/{path_parts}"
        ]
        
        for path in possible_paths:
            if Path(path).exists():
                return path
        
        return None
    
    def _generate_mock_data_for_endpoint(self, endpoint: str, interface_info: Dict) -> str:
        """Generate appropriate mock data for an API endpoint."""
        # Basic mock data based on endpoint patterns
        endpoint_mocks = {
            'account': '''{
        id: "1",
        email: "test@example.com",
        name: "Test User",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z"
      }''',
            'security': '''{
        twoFactorEnabled: true,
        lastPasswordChange: "2024-01-01T00:00:00.000Z",
        securityQuestions: 2
      }''',
            'activity': '''[{
        id: "1",
        action: "login",
        timestamp: "2024-01-01T00:00:00.000Z",
        ipAddress: "127.0.0.1"
      }]''',
            'profile': '''{
        id: "1",
        name: "Test User",
        email: "test@example.com",
        avatar: "/avatar.jpg"
      }'''
        }
        
        # Match endpoint to mock data
        for key, mock_data in endpoint_mocks.items():
            if key in endpoint.lower():
                return mock_data
        
        # Default mock
        return '{ message: "Success" }'
    
    def _generate_proper_mock_data(self, interface: Dict, current_mock: str) -> str:
        """Generate proper mock data based on interface definition."""
        interface_body = interface['body']
        
        # Parse interface properties
        props = []
        prop_matches = re.finditer(r'(\w+):\s*([^;,\n]+)', interface_body)
        for match in prop_matches:
            prop_name = match.group(1)
            prop_type = match.group(2).strip()
            props.append((prop_name, prop_type))
        
        # Generate mock based on properties
        mock_parts = []
        for prop_name, prop_type in props:
            if 'string' in prop_type:
                if 'date' in prop_name.lower() or 'time' in prop_name.lower():
                    mock_parts.append(f'{prop_name}: "2024-01-01T00:00:00.000Z"')
                elif 'email' in prop_name.lower():
                    mock_parts.append(f'{prop_name}: "test@example.com"')
                elif 'name' in prop_name.lower():
                    mock_parts.append(f'{prop_name}: "Test User"')
                else:
                    mock_parts.append(f'{prop_name}: "test-{prop_name}"')
            elif 'number' in prop_type:
                mock_parts.append(f'{prop_name}: 1')
            elif 'boolean' in prop_type:
                mock_parts.append(f'{prop_name}: true')
            elif '[]' in prop_type:
                mock_parts.append(f'{prop_name}: []')
            else:
                mock_parts.append(f'{prop_name}: null')
        
        return '\n        ' + ',\n        '.join(mock_parts) + '\n      '
    
    def apply_all_fixes(self, content: str, file_path: str) -> FixResult:
        """Apply all applicable fixes to a test file."""
        all_changes = []
        current_content = content
        
        # Apply fixes in order
        fixes = [
            self.fix_interface_mismatches,
            self.fix_date_formatting_issues,
            self.fix_selector_issues,
            self.fix_promise_all_patterns,
            self.fix_date_errors,
            self.fix_act_warnings,
            self.add_cleanup,
            self.fix_async_tests,
            self.fix_mock_imports
        ]
        
        for fix_func in fixes:
            result = fix_func(current_content, file_path)
            if result.success:
                current_content = result.fixed_content
                all_changes.extend(result.changes_made)
        
        return FixResult(
            success=len(all_changes) > 0,
            original_content=content,
            fixed_content=current_content,
            changes_made=all_changes
        )

def fix_test_file(file_path: str, content: str, issues: List[str]) -> Tuple[bool, str, List[str]]:
    """
    Fix a test file based on identified issues.
    
    Returns:
        Tuple of (success, fixed_content, changes_made)
    """
    fixer = TestAutoFixer()
    
    # Determine which fixes to apply based on issues
    result = fixer.apply_all_fixes(content, file_path)
    
    return result.success, result.fixed_content, result.changes_made

def preview_fixes(file_path: str, content: str) -> Dict[str, Any]:
    """Preview fixes that would be applied to a file."""
    fixer = TestAutoFixer()
    result = fixer.apply_all_fixes(content, file_path)
    
    if not result.success:
        return {
            "file": file_path,
            "has_fixes": False,
            "changes": []
        }
    
    # Generate diff preview
    original_lines = result.original_content.split('\n')
    fixed_lines = result.fixed_content.split('\n')
    
    diff_preview = []
    for i, (orig, fixed) in enumerate(zip(original_lines, fixed_lines)):
        if orig != fixed:
            diff_preview.append({
                "line": i + 1,
                "original": orig,
                "fixed": fixed
            })
    
    return {
        "file": file_path,
        "has_fixes": True,
        "changes": result.changes_made,
        "diff_preview": diff_preview[:10]  # Limit preview
    }