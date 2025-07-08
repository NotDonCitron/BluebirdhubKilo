from __future__ import annotations

import re
import json
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import ast
from collections import defaultdict

def analyze_test_error(error: str, file_path: str, test_files: Dict[str, str], source_files: Dict[str, str]) -> Dict[str, Any]:
    """Analyze a test error and provide detailed information."""
    analysis = {
        "error_type": _classify_error(error),
        "severity": _determine_severity(error),
        "file": file_path,
        "error_message": error,
        "likely_causes": [],
        "affected_components": [],
        "stack_trace_analysis": {}
    }
    
    # Analyze based on error type
    if "RangeError: Invalid time value" in error:
        analysis["likely_causes"] = [
            "Invalid date object or timestamp",
            "Date parsing issues",
            "Timezone handling problems",
            "Mock date not properly configured"
        ]
        analysis["affected_components"] = _find_date_usage(test_files.get(file_path, ""))
        
    elif "not wrapped in act" in error:
        analysis["likely_causes"] = [
            "State updates not wrapped in act()",
            "Async operations not properly awaited",
            "useEffect or timer callbacks triggering updates",
            "Missing waitFor for async assertions"
        ]
        analysis["affected_components"] = _find_state_updates(test_files.get(file_path, ""))
        
    elif "Cannot read property" in error or "Cannot read properties" in error:
        analysis["likely_causes"] = [
            "Component not properly mocked",
            "Missing props in test",
            "Async data not loaded",
            "Null/undefined reference"
        ]
        
    return analysis

def extract_test_patterns(test_files: Dict[str, str]) -> List[Dict[str, Any]]:
    """Extract common patterns and potential issues from test files."""
    patterns = []
    
    for file_path, content in test_files.items():
        # Check for missing cleanup
        if "afterEach" not in content and ("render" in content or "mount" in content):
            patterns.append({
                "type": "missing_cleanup",
                "file": file_path,
                "severity": "medium",
                "recommendation": "Add afterEach cleanup to prevent test pollution"
            })
        
        # Check for improper mocking
        mock_patterns = re.findall(r'jest\.mock\([\'"](.+?)[\'"]\)', content)
        for mock in mock_patterns:
            if "__mocks__" not in content and not _check_mock_file_exists(mock):
                patterns.append({
                    "type": "improper_mock",
                    "file": file_path,
                    "module": mock,
                    "severity": "high",
                    "recommendation": f"Ensure mock file exists for {mock}"
                })
        
        # Check for async issues
        async_tests = re.findall(r'it\([\'"](.+?)[\'"]\s*,\s*async', content)
        for test_name in async_tests:
            test_block = _extract_test_block(content, test_name)
            if test_block and "await" not in test_block:
                patterns.append({
                    "type": "async_issue",
                    "file": file_path,
                    "test": test_name,
                    "severity": "high",
                    "recommendation": "Async test without await statements"
                })
        
        # Check for slow tests
        if "setTimeout" in content or "wait(" in content:
            timeout_matches = re.findall(r'(?:setTimeout|wait)\(.*?(\d+)\)', content)
            for timeout in timeout_matches:
                if int(timeout) > 1000:
                    patterns.append({
                        "type": "slow_test",
                        "file": file_path,
                        "timeout": timeout,
                        "severity": "low",
                        "recommendation": "Consider using fake timers for long timeouts"
                    })
        
    return patterns

def find_related_files(file_path: str, test_files: Dict[str, str], source_files: Dict[str, str]) -> List[str]:
    """Find files related to the given test file."""
    related = []
    
    # Extract component name from test file
    base_name = Path(file_path).stem.replace('.test', '').replace('.spec', '')
    
    # Find source file
    for src_path in source_files:
        if base_name in src_path and not src_path.endswith('.test.tsx'):
            related.append(src_path)
    
    # Find imports in the test file
    test_content = test_files.get(file_path, "")
    import_matches = re.findall(r'import.*from\s+[\'"](.+?)[\'"]', test_content)
    
    for import_path in import_matches:
        if not import_path.startswith('.'):
            continue
        # Resolve relative imports
        resolved_path = _resolve_import_path(file_path, import_path)
        if resolved_path in source_files:
            related.append(resolved_path)
    
    return list(set(related))

def generate_fix_suggestions(analysis: Dict[str, Any], related_files: List[str], mock_files: Dict[str, str]) -> Dict[str, Any]:
    """Generate fix suggestions based on the analysis."""
    suggestions = {
        "auto_fixable": False,
        "fixes": [],
        "manual_fixes": [],
        "code_examples": []
    }
    
    error_type = analysis.get("error_type", "")
    
    if error_type == "date_error":
        suggestions["fixes"].append({
            "type": "mock_date",
            "file": analysis["file"],
            "fix": "Add proper date mocking in beforeEach",
            "code": """beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-01'));
});

afterEach(() => {
  jest.useRealTimers();
});""",
            "auto_applicable": True
        })
        suggestions["auto_fixable"] = True
        
    elif error_type == "act_warning":
        for component in analysis.get("affected_components", []):
            suggestions["fixes"].append({
                "type": "wrap_in_act",
                "file": analysis["file"],
                "component": component,
                "fix": f"Wrap {component} updates in act()",
                "code": f"""await act(async () => {{
  // Your {component} update here
}});""",
                "auto_applicable": True
            })
        suggestions["auto_fixable"] = True
        
    elif error_type == "null_reference":
        suggestions["manual_fixes"].append(
            "Check component props and ensure all required props are provided in tests"
        )
        suggestions["manual_fixes"].append(
            "Verify that async data is properly mocked or loaded before assertions"
        )
        suggestions["code_examples"].append({
            "description": "Proper component mocking",
            "code": """const mockProps = {
  data: { id: 1, name: 'Test' },
  onSubmit: jest.fn(),
  // Add all required props
};

render(<YourComponent {...mockProps} />);"""
        })
    
    return suggestions

def validate_test_environment(package_json: Dict[str, Any], jest_config: Dict[str, Any], test_files: Dict[str, str]) -> Dict[str, Any]:
    """Validate the test environment configuration."""
    validation = {
        "status": "valid",
        "issues": [],
        "recommendations": []
    }
    
    # Check Jest configuration
    if not jest_config:
        validation["issues"].append({
            "type": "missing_config",
            "severity": "critical",
            "message": "Jest configuration not found",
            "recommendation": "Create a jest.config.js file"
        })
    else:
        # Check for common configuration issues
        if "testEnvironment" not in jest_config:
            validation["issues"].append({
                "type": "config_issue",
                "severity": "medium",
                "message": "testEnvironment not specified",
                "recommendation": "Add testEnvironment: 'jsdom' for React testing"
            })
        
        if "setupFilesAfterEnv" not in jest_config:
            validation["issues"].append({
                "type": "config_issue",
                "severity": "medium",
                "message": "No setup files configured",
                "recommendation": "Add setupFilesAfterEnv for test utilities"
            })
    
    # Check package.json dependencies
    dev_deps = package_json.get("devDependencies", {})
    required_deps = [
        "@testing-library/react",
        "@testing-library/jest-dom",
        "@testing-library/user-event",
        "jest",
        "@types/jest"
    ]
    
    for dep in required_deps:
        if dep not in dev_deps:
            validation["issues"].append({
                "type": "missing_dependency",
                "severity": "high",
                "message": f"Missing {dep}",
                "recommendation": f"Install {dep}: npm install --save-dev {dep}"
            })
    
    # Check for test file patterns
    test_count = len(test_files)
    if test_count == 0:
        validation["issues"].append({
            "type": "no_tests",
            "severity": "critical",
            "message": "No test files found",
            "recommendation": "Create test files with .test.tsx or .spec.tsx extension"
        })
    
    if validation["issues"]:
        validation["status"] = "invalid"
    
    return validation

def analyze_act_warnings(file_path: str, content: str, source_files: Dict[str, str]) -> Dict[str, Any]:
    """Analyze act() warnings in test files."""
    analysis = {
        "file": file_path,
        "warnings": [],
        "suggestions": []
    }
    
    # Find all test blocks
    test_blocks = re.findall(r'(?:it|test)\([\'"](.+?)[\'"]\s*,\s*(async\s*)?\(\)\s*=>\s*{([^}]+)}', content, re.DOTALL)
    
    for test_name, is_async, test_body in test_blocks:
        # Check for state updates without act
        if "render" in test_body or "mount" in test_body:
            # Look for click events, form submissions, etc.
            events = re.findall(r'(fireEvent\.\w+|userEvent\.\w+|\.click\(|\.submit\(|\.change\()', test_body)
            
            for event in events:
                # Check if wrapped in act
                event_context = _get_context_around_match(test_body, event)
                if "act(" not in event_context and "waitFor" not in event_context:
                    line_num = _get_line_number(content, event)
                    analysis["warnings"].append({
                        "type": "missing_act",
                        "test": test_name,
                        "event": event,
                        "location": {"line": line_num, "column": 0},
                        "explanation": f"{event} may cause state updates that need act() wrapper"
                    })
        
        # Check for async operations
        if is_async and "await" in test_body:
            # Look for assertions after async operations
            async_patterns = re.findall(r'await\s+(\w+).*\n.*expect', test_body)
            for pattern in async_patterns:
                if "waitFor" not in test_body:
                    line_num = _get_line_number(content, pattern)
                    analysis["warnings"].append({
                        "type": "missing_waitfor",
                        "test": test_name,
                        "operation": pattern,
                        "location": {"line": line_num, "column": 0},
                        "explanation": "Async operations may need waitFor for assertions"
                    })
    
    return analysis

def analyze_timing_errors(test_files: Dict[str, str], test_results: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze timing-related errors in tests."""
    analysis = {
        "issues": [],
        "slow_tests": [],
        "timeout_errors": [],
        "recommendations": []
    }
    
    # Analyze test results for timing issues
    if test_results:
        for test_suite in test_results.get("testResults", []):
            for test in test_suite.get("assertionResults", []):
                if test.get("status") == "failed":
                    failure_msg = test.get("failureMessages", [""])[0]
                    if "timeout" in failure_msg.lower():
                        analysis["timeout_errors"].append({
                            "test": test.get("title"),
                            "file": test_suite.get("name"),
                            "message": failure_msg
                        })
                
                duration = test.get("duration", 0)
                if duration > 1000:  # Tests taking more than 1 second
                    analysis["slow_tests"].append({
                        "test": test.get("title"),
                        "file": test_suite.get("name"),
                        "duration": duration
                    })
    
    # Check for common timing issues in code
    for file_path, content in test_files.items():
        # Check for real timers
        if "setTimeout" in content and "useFakeTimers" not in content:
            analysis["issues"].append({
                "type": "real_timers",
                "file": file_path,
                "recommendation": "Use jest.useFakeTimers() for timer-based tests"
            })
        
        # Check for hardcoded waits
        wait_patterns = re.findall(r'await\s+(?:new\s+Promise|delay|wait)\((\d+)\)', content)
        for wait_time in wait_patterns:
            if int(wait_time) > 100:
                analysis["issues"].append({
                    "type": "hardcoded_wait",
                    "file": file_path,
                    "duration": wait_time,
                    "recommendation": "Replace hardcoded waits with waitFor or fake timers"
                })
    
    return analysis

def generate_test_report(test_files: Dict[str, str], test_results: Dict[str, Any], 
                        coverage_data: Dict[str, Any], fixed_issues: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate a comprehensive test report."""
    report = {
        "summary": {
            "total_test_files": len(test_files),
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "coverage_percentage": 0,
            "issues_fixed": len(fixed_issues)
        },
        "detailed_results": [],
        "coverage_summary": {},
        "fixed_issues": fixed_issues,
        "recommendations": []
    }
    
    # Process test results
    if test_results:
        for test_suite in test_results.get("testResults", []):
            suite_summary = {
                "file": test_suite.get("name"),
                "tests": test_suite.get("numPassingTests", 0) + test_suite.get("numFailingTests", 0),
                "passed": test_suite.get("numPassingTests", 0),
                "failed": test_suite.get("numFailingTests", 0),
                "duration": test_suite.get("perfStats", {}).get("runtime", 0)
            }
            report["detailed_results"].append(suite_summary)
            report["summary"]["total_tests"] += suite_summary["tests"]
            report["summary"]["passed_tests"] += suite_summary["passed"]
            report["summary"]["failed_tests"] += suite_summary["failed"]
    
    # Process coverage data
    if coverage_data:
        coverage_summary = coverage_data.get("total", {})
        report["coverage_summary"] = {
            "lines": coverage_summary.get("lines", {}).get("pct", 0),
            "statements": coverage_summary.get("statements", {}).get("pct", 0),
            "functions": coverage_summary.get("functions", {}).get("pct", 0),
            "branches": coverage_summary.get("branches", {}).get("pct", 0)
        }
        report["summary"]["coverage_percentage"] = coverage_summary.get("lines", {}).get("pct", 0)
    
    # Generate recommendations
    if report["summary"]["failed_tests"] > 0:
        report["recommendations"].append("Focus on fixing failing tests first")
    
    if report["summary"]["coverage_percentage"] < 80:
        report["recommendations"].append("Increase test coverage to at least 80%")
    
    return report

def check_mock_consistency(mock_files: Dict[str, str], source_files: Dict[str, str]) -> List[Dict[str, Any]]:
    """Check consistency between mocks and actual implementations."""
    issues = []
    
    for mock_path, mock_content in mock_files.items():
        # Find corresponding source file
        source_path = mock_path.replace("__mocks__/", "").replace("/__mocks__", "")
        
        if source_path in source_files:
            source_content = source_files[source_path]
            
            # Extract exported functions/components from source
            source_exports = _extract_exports(source_content)
            mock_exports = _extract_exports(mock_content)
            
            # Check for missing mocks
            for export in source_exports:
                if export not in mock_exports:
                    issues.append({
                        "type": "missing_mock",
                        "mock_file": mock_path,
                        "source_file": source_path,
                        "export": export,
                        "severity": "medium",
                        "recommendation": f"Add mock for {export} in {mock_path}"
                    })
            
            # Check for extra mocks
            for export in mock_exports:
                if export not in source_exports:
                    issues.append({
                        "type": "extra_mock",
                        "mock_file": mock_path,
                        "export": export,
                        "severity": "low",
                        "recommendation": f"Remove unused mock {export} from {mock_path}"
                    })
    
    return issues

def analyze_test_coverage(coverage_data: Dict[str, Any], source_files: Dict[str, str]) -> Dict[str, Any]:
    """Analyze test coverage and identify areas needing more tests."""
    analysis = {
        "overall_coverage": {},
        "uncovered_files": [],
        "low_coverage_files": [],
        "recommendations": []
    }
    
    if not coverage_data:
        analysis["recommendations"].append("No coverage data available. Run tests with coverage enabled.")
        return analysis
    
    # Overall coverage
    total = coverage_data.get("total", {})
    analysis["overall_coverage"] = {
        "lines": total.get("lines", {}).get("pct", 0),
        "statements": total.get("statements", {}).get("pct", 0),
        "functions": total.get("functions", {}).get("pct", 0),
        "branches": total.get("branches", {}).get("pct", 0)
    }
    
    # File-level coverage
    for file_path, file_coverage in coverage_data.items():
        if file_path == "total":
            continue
        
        line_coverage = file_coverage.get("lines", {}).get("pct", 0)
        
        if line_coverage == 0:
            analysis["uncovered_files"].append(file_path)
        elif line_coverage < 50:
            analysis["low_coverage_files"].append({
                "file": file_path,
                "coverage": line_coverage
            })
    
    # Generate recommendations
    if analysis["uncovered_files"]:
        analysis["recommendations"].append(
            f"Add tests for {len(analysis['uncovered_files'])} uncovered files"
        )
    
    if analysis["low_coverage_files"]:
        analysis["recommendations"].append(
            f"Improve coverage for {len(analysis['low_coverage_files'])} files with low coverage"
        )
    
    return analysis

# Helper functions

def _classify_error(error: str) -> str:
    """Classify the type of error."""
    if "RangeError: Invalid time value" in error:
        return "date_error"
    elif "not wrapped in act" in error:
        return "act_warning"
    elif "Cannot read property" in error or "Cannot read properties" in error:
        return "null_reference"
    elif "timeout" in error.lower():
        return "timeout_error"
    elif "SyntaxError" in error:
        return "syntax_error"
    else:
        return "unknown"

def _determine_severity(error: str) -> str:
    """Determine the severity of an error."""
    critical_patterns = ["SyntaxError", "ReferenceError", "TypeError"]
    high_patterns = ["Cannot read property", "Invalid time value", "timeout"]
    medium_patterns = ["act", "warning", "deprecated"]
    
    error_lower = error.lower()
    
    for pattern in critical_patterns:
        if pattern.lower() in error_lower:
            return "critical"
    
    for pattern in high_patterns:
        if pattern.lower() in error_lower:
            return "high"
    
    for pattern in medium_patterns:
        if pattern.lower() in error_lower:
            return "medium"
    
    return "low"

def _find_date_usage(content: str) -> List[str]:
    """Find components/functions using dates."""
    components = []
    
    # Find Date constructor usage
    date_patterns = re.findall(r'new\s+Date\([^)]*\)', content)
    for pattern in date_patterns:
        # Try to find the containing component/function
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if pattern in line:
                # Look backwards for component/function declaration
                for j in range(i, max(0, i-10), -1):
                    if "const" in lines[j] or "function" in lines[j] or "describe" in lines[j]:
                        components.append(lines[j].strip())
                        break
    
    return list(set(components))

def _find_state_updates(content: str) -> List[str]:
    """Find components with state updates."""
    components = []
    
    # Find state update patterns
    state_patterns = [
        r'set\w+\(',  # setState, setData, etc.
        r'dispatch\(',  # Redux dispatch
        r'\.submit\(',  # Form submissions
        r'fireEvent\.',  # Fire events
        r'userEvent\.'  # User events
    ]
    
    for pattern in state_patterns:
        matches = re.findall(pattern, content)
        components.extend(matches)
    
    return list(set(components))

def _check_mock_file_exists(mock_path: str) -> bool:
    """Check if a mock file exists (simplified check)."""
    # In a real implementation, this would check the file system
    return "__mocks__" in mock_path

def _extract_test_block(content: str, test_name: str) -> Optional[str]:
    """Extract a test block by name."""
    pattern = rf'it\([\'\"]{re.escape(test_name)}[\'\"]\s*,\s*async\s*\(\)\s*=>\s*{{([^}}]+)}}'
    match = re.search(pattern, content, re.DOTALL)
    return match.group(1) if match else None

def _resolve_import_path(from_file: str, import_path: str) -> str:
    """Resolve a relative import path."""
    if not import_path.startswith('.'):
        return import_path
    
    from_dir = str(Path(from_file).parent)
    resolved = str(Path(from_dir) / import_path)
    
    # Add extension if missing
    if not resolved.endswith(('.ts', '.tsx', '.js', '.jsx')):
        for ext in ['.tsx', '.ts', '.jsx', '.js']:
            if Path(resolved + ext).exists():
                resolved += ext
                break
    
    return resolved

def _get_context_around_match(content: str, match: str) -> str:
    """Get context around a match in content."""
    index = content.find(match)
    if index == -1:
        return ""
    
    start = max(0, index - 100)
    end = min(len(content), index + len(match) + 100)
    return content[start:end]

def _get_line_number(content: str, match: str) -> int:
    """Get the line number of a match in content."""
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if match in line:
            return i + 1
    return 0

def _extract_exports(content: str) -> List[str]:
    """Extract exported names from a file."""
    exports = []
    
    # export const/function/class
    export_patterns = [
        r'export\s+(?:const|let|var)\s+(\w+)',
        r'export\s+function\s+(\w+)',
        r'export\s+class\s+(\w+)',
        r'export\s+{\s*([^}]+)\s*}'
    ]
    
    for pattern in export_patterns:
        matches = re.findall(pattern, content)
        for match in matches:
            if ',' in match:  # Handle multiple exports
                exports.extend([e.strip() for e in match.split(',')])
            else:
                exports.append(match)
    
    # export default
    if "export default" in content:
        exports.append("default")
    
    return list(set(exports))

def analyze_component_interface(component_path: str) -> Dict[str, Any]:
    """Analyze component file to extract interface information."""
    if not Path(component_path).exists():
        return {'interfaces': [], 'api_endpoints': [], 'props': [], 'hooks': [], 'imports': []}
    
    try:
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
        
        return interface_info
        
    except Exception as e:
        print(f"Error analyzing component {component_path}: {e}")
        return {'interfaces': [], 'api_endpoints': [], 'props': [], 'hooks': [], 'imports': []}

def detect_interface_mismatches(test_file_path: str, test_content: str, component_path: str) -> List[Dict[str, Any]]:
    """Detect interface mismatches between test mocks and component expectations."""
    mismatches = []
    
    if not component_path or not Path(component_path).exists():
        return mismatches
    
    component_info = analyze_component_interface(component_path)
    
    # Check API endpoint mismatches
    for endpoint in component_info['api_endpoints']:
        # Look for generic fetch mocks that should be specific
        generic_patterns = [
            r'fetch\.mockResolvedValueOnce\(\s*{[^}]*ok:\s*true[^}]*}\s*\)',
            r'global\.fetch\.mockResolvedValue\(\s*{[^}]*ok:\s*true[^}]*}\s*\)'
        ]
        
        for pattern in generic_patterns:
            if re.search(pattern, test_content):
                mismatches.append({
                    'type': 'generic_api_mock',
                    'file': test_file_path,
                    'endpoint': endpoint,
                    'severity': 'high',
                    'description': f'Generic fetch mock should be endpoint-specific for {endpoint}',
                    'recommendation': f'Use endpoint-specific mock implementation for {endpoint}'
                })
    
    # Check mock data structure mismatches
    for interface in component_info['interfaces']:
        interface_name = interface['name']
        # Look for mock data that should match this interface
        mock_patterns = [
            rf'{interface_name.lower()}[^:]*:\s*{{([^}}]+)}}',
            rf'mock{interface_name}\s*=\s*{{([^}}]+)}}'
        ]
        
        for pattern in mock_patterns:
            matches = re.finditer(pattern, test_content, re.DOTALL)
            for match in matches:
                mismatches.append({
                    'type': 'interface_mismatch',
                    'file': test_file_path,
                    'interface': interface_name,
                    'severity': 'high',
                    'description': f'Mock data structure may not match {interface_name} interface',
                    'recommendation': f'Verify mock data matches {interface_name} interface properties'
                })
    
    return mismatches

def analyze_date_formatting_issues(test_file_path: str, test_content: str) -> List[Dict[str, Any]]:
    """Analyze comprehensive date formatting issues in test files."""
    issues = []
    
    # Check for invalid date strings
    invalid_date_patterns = [
        (r'createdAt:\s*[\'"]invalid[^\'\"]*[\'"]', 'Invalid createdAt date string'),
        (r'updatedAt:\s*[\'"]invalid[^\'\"]*[\'"]', 'Invalid updatedAt date string'),
        (r'lastLogin:\s*[\'"]invalid[^\'\"]*[\'"]', 'Invalid lastLogin date string'),
        (r'timestamp:\s*[\'"]invalid[^\'\"]*[\'"]', 'Invalid timestamp date string'),
        (r'date:\s*[\'"]invalid[^\'\"]*[\'"]', 'Invalid date string'),
        # Check for malformed ISO dates
        (r'[\'"]202\d-\d{1,2}-\d{1,2}[\'"]', 'Malformed ISO date (missing time component)'),
        (r'[\'"]202\d/\d{1,2}/\d{1,2}[\'"]', 'Invalid date format (should be ISO 8601)'),
    ]
    
    for pattern, description in invalid_date_patterns:
        if re.search(pattern, test_content):
            issues.append({
                'type': 'invalid_date_format',
                'file': test_file_path,
                'severity': 'high',
                'description': description,
                'recommendation': 'Use valid ISO 8601 date format: "2024-01-01T00:00:00.000Z"'
            })
    
    # Check for missing date library mocking
    if 'date-fns' in test_content and 'jest.mock' not in test_content:
        issues.append({
            'type': 'missing_date_library_mock',
            'file': test_file_path,
            'severity': 'medium',
            'description': 'date-fns used but not mocked',
            'recommendation': 'Add jest.mock for date-fns to ensure consistent date formatting'
        })
    
    # Check for "Invalid time value" error patterns
    if 'new Date(' in test_content:
        # Look for potentially invalid date constructor calls
        date_constructors = re.findall(r'new Date\(([^)]*)\)', test_content)
        for constructor in date_constructors:
            if any(invalid in constructor for invalid in ['undefined', 'null', '""', 'invalid']):
                issues.append({
                    'type': 'invalid_date_constructor',
                    'file': test_file_path,
                    'severity': 'high',
                    'description': f'Invalid Date constructor: new Date({constructor})',
                    'recommendation': 'Use valid date string or timestamp'
                })
    
    return issues

def analyze_selector_issues(test_file_path: str, test_content: str) -> List[Dict[str, Any]]:
    """Analyze selector issues in test files."""
    issues = []
    
    # Check for common selector mismatches
    selector_patterns = [
        (r'getByRole\([\'"]loading[\'"]', 'Loading state should use CSS selector, not role'),
        (r'getByRole\([\'"]spinner[\'"]', 'Spinner should use CSS selector, not role'),
        (r'getByRole\([\'"]error[\'"]', 'Error state should use CSS selector, not role'),
        (r'queryByRole\([\'"]loading[\'"]', 'Loading state should use CSS selector, not role'),
        (r'getByTestId\([\'"]submit[\'"]', 'Generic submit selector should be more specific'),
    ]
    
    for pattern, description in selector_patterns:
        if re.search(pattern, test_content, re.IGNORECASE):
            issues.append({
                'type': 'selector_mismatch',
                'file': test_file_path,
                'severity': 'medium',
                'description': description,
                'recommendation': 'Use appropriate selector type for the element'
            })
    
    # Check for waitFor with incorrect selectors
    waitfor_patterns = re.findall(r'waitFor\(\(\)\s*=>\s*expect\(.*?(getByRole\([\'"][^\'\"]+[\'"])', test_content)
    for pattern in waitfor_patterns:
        if any(invalid in pattern for invalid in ['loading', 'spinner', 'error']):
            issues.append({
                'type': 'waitfor_selector_issue',
                'file': test_file_path,
                'severity': 'medium',
                'description': f'waitFor using potentially incorrect selector: {pattern}',
                'recommendation': 'Use CSS selector or proper semantic role'
            })
    
    return issues

def analyze_promise_all_patterns(test_file_path: str, test_content: str, component_path: str) -> List[Dict[str, Any]]:
    """Analyze Promise.all patterns in test files."""
    issues = []
    
    if not component_path or not Path(component_path).exists():
        return issues
    
    component_info = analyze_component_interface(component_path)
    
    # If component has multiple API endpoints, likely uses Promise.all
    if len(component_info['api_endpoints']) > 1:
        # Check if test uses single mockResolvedValueOnce for multiple endpoints
        if 'fetch.mockResolvedValueOnce' in test_content:
            issues.append({
                'type': 'promise_all_mock_issue',
                'file': test_file_path,
                'severity': 'high',
                'description': 'Component uses multiple API endpoints but test uses single mock',
                'recommendation': 'Use fetch.mockImplementation to handle multiple concurrent API calls',
                'endpoints': component_info['api_endpoints']
            })
    
    return issues

def comprehensive_test_analysis(test_file_path: str, test_content: str, source_files: Dict[str, str]) -> Dict[str, Any]:
    """Provide comprehensive analysis of test file issues."""
    # Find corresponding component file
    component_path = _find_component_path_from_test(test_file_path, source_files)
    
    analysis = {
        'file': test_file_path,
        'component_file': component_path,
        'interface_mismatches': [],
        'date_issues': [],
        'selector_issues': [],
        'promise_all_issues': [],
        'act_warnings': [],
        'general_issues': []
    }
    
    # Analyze interface mismatches
    if component_path:
        analysis['interface_mismatches'] = detect_interface_mismatches(
            test_file_path, test_content, component_path
        )
    
    # Analyze date formatting issues
    analysis['date_issues'] = analyze_date_formatting_issues(test_file_path, test_content)
    
    # Analyze selector issues
    analysis['selector_issues'] = analyze_selector_issues(test_file_path, test_content)
    
    # Analyze Promise.all patterns
    if component_path:
        analysis['promise_all_issues'] = analyze_promise_all_patterns(
            test_file_path, test_content, component_path
        )
    else:
        analysis['promise_all_issues'] = []
    
    # Analyze act warnings (existing function)
    analysis['act_warnings'] = analyze_act_warnings(test_file_path, test_content, source_files)
    
    # Calculate total issues
    total_issues = (
        len(analysis['interface_mismatches']) +
        len(analysis['date_issues']) +
        len(analysis['selector_issues']) +
        len(analysis['promise_all_issues']) +
        len(analysis['act_warnings'].get('warnings', []))
    )
    
    analysis['total_issues'] = total_issues
    analysis['severity'] = 'high' if total_issues > 5 else 'medium' if total_issues > 2 else 'low'
    
    return analysis

def _find_component_path_from_test(test_path: str, source_files: Dict[str, str]) -> Optional[str]:
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
        if path in source_files:
            return path
    
    return None

def generate_enhanced_fix_suggestions(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Generate enhanced fix suggestions based on comprehensive analysis."""
    suggestions = {
        "auto_fixable": False,
        "fixes": [],
        "manual_fixes": [],
        "code_examples": [],
        "priority": "medium"
    }
    
    total_issues = analysis.get('total_issues', 0)
    
    if total_issues > 5:
        suggestions["priority"] = "high"
    elif total_issues > 2:
        suggestions["priority"] = "medium"
    else:
        suggestions["priority"] = "low"
    
    # Interface mismatch fixes
    for issue in analysis.get('interface_mismatches', []):
        suggestions["fixes"].append({
            "type": "interface_fix",
            "description": issue['description'],
            "recommendation": issue['recommendation'],
            "auto_applicable": True
        })
    
    # Date formatting fixes
    for issue in analysis.get('date_issues', []):
        suggestions["fixes"].append({
            "type": "date_fix",
            "description": issue['description'],
            "recommendation": issue['recommendation'],
            "auto_applicable": True
        })
    
    # Selector fixes
    for issue in analysis.get('selector_issues', []):
        suggestions["fixes"].append({
            "type": "selector_fix",
            "description": issue['description'],
            "recommendation": issue['recommendation'],
            "auto_applicable": True
        })
    
    # Promise.all fixes
    for issue in analysis.get('promise_all_issues', []):
        suggestions["fixes"].append({
            "type": "promise_all_fix",
            "description": issue['description'],
            "recommendation": issue['recommendation'],
            "auto_applicable": True
        })
    
    # Act warning fixes
    act_warnings = analysis.get('act_warnings', {})
    for warning in act_warnings.get('warnings', []):
        suggestions["fixes"].append({
            "type": "act_fix",
            "description": warning['explanation'],
            "recommendation": f"Wrap {warning.get('event', 'operation')} in act()",
            "auto_applicable": True
        })
    
    # Set auto_fixable based on fix types
    suggestions["auto_fixable"] = len(suggestions["fixes"]) > 0
    
    return suggestions