from __future__ import annotations

import asyncio
import os
from pathlib import Path
import json
from typing import Dict, Any, List
import sys

# Add parent directory to path to import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent import test_debug_agent, TestDebugDeps

async def load_test_files(test_paths: List[str]) -> Dict[str, str]:
    """Load all test files from the specified directories."""
    test_files = {}
    
    for test_path in test_paths:
        path = Path(test_path)
        if path.exists():
            # Load .test.tsx, .test.ts, .test.jsx, .test.js files
            for pattern in ['**/*.test.tsx', '**/*.test.ts', '**/*.test.jsx', '**/*.test.js']:
                for file_path in path.glob(pattern):
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            test_files[str(file_path)] = f.read()
                    except Exception as e:
                        print(f"Error reading {file_path}: {e}")
    
    return test_files

async def load_source_files(src_paths: List[str]) -> Dict[str, str]:
    """Load all source files from the specified directories."""
    source_files = {}
    
    for src_path in src_paths:
        path = Path(src_path)
        if path.exists():
            # Load source files excluding test files
            for pattern in ['**/*.tsx', '**/*.ts', '**/*.jsx', '**/*.js']:
                for file_path in path.glob(pattern):
                    if not any(test_marker in str(file_path) for test_marker in ['.test.', '.spec.', '__tests__']):
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                source_files[str(file_path)] = f.read()
                        except Exception as e:
                            print(f"Error reading {file_path}: {e}")
    
    return source_files

async def load_mock_files(mock_paths: List[str]) -> Dict[str, str]:
    """Load all mock files."""
    mock_files = {}
    
    for mock_path in mock_paths:
        path = Path(mock_path)
        if path.exists():
            for pattern in ['**/*.tsx', '**/*.ts', '**/*.jsx', '**/*.js']:
                for file_path in path.glob(pattern):
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            mock_files[str(file_path)] = f.read()
                    except Exception as e:
                        print(f"Error reading {file_path}: {e}")
    
    return mock_files

async def load_json_file(file_path: str) -> Dict[str, Any]:
    """Load a JSON file safely."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"File not found: {file_path}")
        return {}
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON from {file_path}: {e}")
        return {}
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return {}

async def load_jest_config(config_path: str) -> Dict[str, Any]:
    """Load Jest configuration (handles .js files)."""
    if not os.path.exists(config_path):
        return {}
    
    # For .js config files, we'll parse them manually
    if config_path.endswith('.js'):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # Basic parsing - in production, use a proper JS parser
                return {"raw_content": content, "type": "js"}
        except Exception as e:
            print(f"Error reading Jest config: {e}")
            return {}
    else:
        return await load_json_file(config_path)

async def main():
    """Main function to run the test debug agent."""
    
    # Define paths relative to the project root
    project_root = Path(__file__).parent.parent  # Go up from test-debug-agent to project root
    app_dir = project_root / "app"
    
    print("🔍 Test Debug Agent Starting...")
    print(f"Project root: {project_root}")
    print(f"App directory: {app_dir}")
    
    # Load test files
    test_paths = [
        str(app_dir / "__tests__"),
        str(app_dir / "app" / "__tests__")  # Check nested structure
    ]
    print("\n📂 Loading test files...")
    test_files = await load_test_files(test_paths)
    print(f"Found {len(test_files)} test files")
    
    # Load source files
    src_paths = [
        str(app_dir / "app"),
        str(app_dir / "components"),
        str(app_dir / "lib"),
        str(app_dir / "hooks")
    ]
    print("\n📂 Loading source files...")
    source_files = await load_source_files(src_paths)
    print(f"Found {len(source_files)} source files")
    
    # Load mock files
    mock_paths = [
        str(app_dir / "__mocks__"),
        str(app_dir / "app" / "__mocks__")
    ]
    print("\n📂 Loading mock files...")
    mock_files = await load_mock_files(mock_paths)
    print(f"Found {len(mock_files)} mock files")
    
    # Load configurations
    print("\n⚙️ Loading configurations...")
    package_json = await load_json_file(str(app_dir / "package.json"))
    jest_config = await load_jest_config(str(app_dir / "jest.config.js"))
    
    # Initialize dependencies
    deps = TestDebugDeps(
        test_files=test_files,
        source_files=source_files,
        package_json=package_json,
        jest_config=jest_config,
        mock_files=mock_files
    )
    
    # Run different analyses based on command line arguments
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "analyze-errors":
            await analyze_specific_errors(deps)
        elif command == "validate":
            await validate_environment(deps)
        elif command == "fix-act":
            await fix_act_warnings(deps)
        elif command == "report":
            await generate_report(deps)
        elif command == "patterns":
            await analyze_patterns(deps)
        else:
            print(f"Unknown command: {command}")
            print_usage()
    else:
        # Default: Run comprehensive analysis
        await run_comprehensive_analysis(deps)

async def analyze_specific_errors(deps: TestDebugDeps):
    """Analyze specific errors from test results."""
    print("\n🔴 Analyzing Critical Errors...")
    
    # These are common errors based on your test structure
    critical_errors = [
        {
            "error": "RangeError: Invalid time value",
            "file": "app/__tests__/components/dashboard/settings/account-settings.test.tsx"
        },
        {
            "error": "An update to AccountSettings inside a test was not wrapped in act(...)",
            "file": "app/__tests__/components/dashboard/settings/account-settings.test.tsx"
        },
        {
            "error": "Cannot read properties of null",
            "file": "app/__tests__/components/dashboard/settings/notification-settings.test.tsx"
        }
    ]
    
    for error in critical_errors:
        print(f"\n📍 Analyzing: {error['error']}")
        print(f"   File: {error['file']}")
        
        # Check if the file exists in our loaded files
        full_path = None
        for path in deps.test_files:
            if error['file'] in path:
                full_path = path
                break
        
        if full_path:
            analysis = await test_debug_agent.run(
                f"Analyze and fix this error: {error['error']} in file {full_path}",
                deps=deps
            )
            
            if analysis.success:
                print("\n✅ Analysis Results:")
                print(f"   Error Type: {analysis.metadata.get('error_type', 'Unknown')}")
                print(f"   Severity: {analysis.metadata.get('severity', 'Unknown')}")
                
                if analysis.suggestions:
                    print("\n📝 Suggestions:")
                    for i, suggestion in enumerate(analysis.suggestions, 1):
                        print(f"   {i}. {suggestion}")
                
                if analysis.fixed_files:
                    print(f"\n🔧 Auto-fixed files: {', '.join(analysis.fixed_files)}")
            else:
                print(f"❌ Analysis failed: {analysis.error}")
        else:
            print(f"⚠️ Test file not found in loaded files")

async def validate_environment(deps: TestDebugDeps):
    """Validate the test environment."""
    print("\n🔍 Validating Test Environment...")
    
    validation = await test_debug_agent.run(
        "Validate the test environment and provide recommendations",
        deps=deps
    )
    
    if validation.success:
        data = validation.data
        print(f"\n📊 Validation Status: {data['validation']['status'].upper()}")
        
        if data['validation']['issues']:
            print("\n⚠️ Issues Found:")
            for issue in data['validation']['issues']:
                print(f"\n   [{issue['severity'].upper()}] {issue['type']}")
                print(f"   Message: {issue['message']}")
                print(f"   Fix: {issue['recommendation']}")
        
        if data.get('mock_issues'):
            print("\n🎭 Mock Issues:")
            for issue in data['mock_issues']:
                print(f"   - {issue['type']}: {issue['export']} in {issue['mock_file']}")
        
        if validation.suggestions:
            print("\n💡 Recommendations:")
            for suggestion in validation.suggestions:
                print(f"   • {suggestion}")
    else:
        print(f"❌ Validation failed: {validation.error}")

async def fix_act_warnings(deps: TestDebugDeps):
    """Fix React act() warnings in test files."""
    print("\n🔧 Fixing Act Warnings...")
    
    # Find test files with potential act warnings
    test_files_with_react = []
    for file_path, content in deps.test_files.items():
        if "render" in content or "mount" in content:
            test_files_with_react.append(file_path)
    
    print(f"Found {len(test_files_with_react)} React test files to check")
    
    for file_path in test_files_with_react[:5]:  # Process first 5 files
        print(f"\n📄 Checking: {Path(file_path).name}")
        
        result = await test_debug_agent.run(
            f"Fix act warnings in {file_path}",
            deps=deps
        )
        
        if result.success and result.data.get('fixes'):
            print(f"   Found {len(result.data['fixes'])} act warnings")
            for fix in result.data['fixes']:
                print(f"   - {fix['type']} at line {fix['location']['line']}")

async def analyze_patterns(deps: TestDebugDeps):
    """Analyze test patterns and common issues."""
    print("\n🔍 Analyzing Test Patterns...")
    
    result = await test_debug_agent.run(
        "Analyze test patterns and identify common issues",
        deps=deps
    )
    
    if result.success:
        patterns = result.data.get('patterns', [])
        issues = result.data.get('issues', [])
        
        print(f"\n📊 Summary: {result.data.get('summary', 'No summary available')}")
        
        if issues:
            print("\n⚠️ Issues Found:")
            issue_types = {}
            for issue in issues:
                issue_type = issue['type']
                if issue_type not in issue_types:
                    issue_types[issue_type] = []
                issue_types[issue_type].append(issue)
            
            for issue_type, items in issue_types.items():
                print(f"\n   {issue_type.replace('_', ' ').title()} ({len(items)} occurrences):")
                for item in items[:3]:  # Show first 3
                    print(f"   - {Path(item['file']).name}")
                    if item.get('recommendation'):
                        print(f"     💡 {item['recommendation']}")

async def generate_report(deps: TestDebugDeps):
    """Generate a comprehensive test report."""
    print("\n📊 Generating Test Report...")
    
    result = await test_debug_agent.run(
        "Generate a comprehensive test report",
        deps=deps
    )
    
    if result.success:
        report = result.data
        summary = report.get('summary', {})
        
        print("\n=== TEST REPORT ===")
        print(f"\n📈 Summary:")
        print(f"   Total Test Files: {summary.get('total_test_files', 0)}")
        print(f"   Total Tests: {summary.get('total_tests', 0)}")
        print(f"   Passed: {summary.get('passed_tests', 0)}")
        print(f"   Failed: {summary.get('failed_tests', 0)}")
        print(f"   Coverage: {summary.get('coverage_percentage', 0)}%")
        print(f"   Issues Fixed: {summary.get('issues_fixed', 0)}")
        
        if report.get('recommendations'):
            print("\n💡 Recommendations:")
            for rec in report['recommendations']:
                print(f"   • {rec}")
        
        # Save report to file
        report_path = Path(__file__).parent / "test_report.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n💾 Full report saved to: {report_path}")

async def run_comprehensive_analysis(deps: TestDebugDeps):
    """Run a comprehensive analysis of all test files."""
    print("\n🚀 Running Comprehensive Analysis...")
    
    # 1. Validate environment
    await validate_environment(deps)
    
    # 2. Analyze patterns
    await analyze_patterns(deps)
    
    # 3. Check for specific errors
    await analyze_specific_errors(deps)
    
    # 4. Generate report
    await generate_report(deps)
    
    print("\n✅ Comprehensive analysis complete!")

def print_usage():
    """Print usage information."""
    print("\nUsage: python main.py [command]")
    print("\nCommands:")
    print("  analyze-errors  - Analyze specific test errors")
    print("  validate       - Validate test environment")
    print("  fix-act        - Fix React act() warnings")
    print("  patterns       - Analyze test patterns")
    print("  report         - Generate test report")
    print("\nNo command runs comprehensive analysis")

if __name__ == "__main__":
    # Enable better error messages for async code
    import warnings
    warnings.filterwarnings("default", category=DeprecationWarning)
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️ Analysis interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()