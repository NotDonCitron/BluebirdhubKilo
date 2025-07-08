from __future__ import annotations

import asyncio
import json
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import re
from datetime import datetime

from agent_tools import (
    analyze_test_error,
    extract_test_patterns,
    find_related_files,
    generate_fix_suggestions,
    validate_test_environment,
    analyze_act_warnings,
    analyze_timing_errors,
    generate_test_report,
    check_mock_consistency,
    analyze_test_coverage
)
from agent_prompts import (
    SYSTEM_PROMPT,
    ERROR_ANALYSIS_PROMPT,
    FIX_GENERATION_PROMPT,
    ENV_VALIDATION_PROMPT,
    ACT_WARNING_PROMPT,
    PERFORMANCE_ANALYSIS_PROMPT
)

@dataclass
class TestDebugDeps:
    """Dependencies for the test debug agent."""
    test_files: Dict[str, str]
    source_files: Dict[str, str]
    package_json: Dict[str, Any]
    jest_config: Dict[str, Any]
    mock_files: Optional[Dict[str, str]] = field(default_factory=dict)
    test_results: Optional[Dict[str, Any]] = field(default_factory=dict)
    coverage_data: Optional[Dict[str, Any]] = field(default_factory=dict)

@dataclass
class AgentResponse:
    """Response from the test debug agent."""
    data: Any
    success: bool
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    suggestions: List[str] = field(default_factory=list)
    fixed_files: List[str] = field(default_factory=list)

class TestDebugAgent:
    """Agent for debugging and fixing test issues."""
    
    def __init__(self):
        self.history: List[Dict[str, Any]] = []
        self.fixed_issues: List[Dict[str, Any]] = []
        self.validation_cache: Dict[str, Any] = {}
        
    async def run(self, prompt: str, deps: TestDebugDeps) -> AgentResponse:
        """Run the agent with the given prompt and dependencies."""
        try:
            # Determine the type of task
            task_type = self._determine_task_type(prompt)
            
            # Execute the appropriate task
            if task_type == "analyze_error":
                return await self._analyze_error(prompt, deps)
            elif task_type == "fix_act_warnings":
                return await self._fix_act_warnings(prompt, deps)
            elif task_type == "validate_environment":
                return await self._validate_environment(deps)
            elif task_type == "analyze_performance":
                return await self._analyze_performance(prompt, deps)
            elif task_type == "generate_report":
                return await self._generate_report(deps)
            else:
                return await self._general_analysis(prompt, deps)
                
        except Exception as e:
            return AgentResponse(
                data=None,
                success=False,
                error=str(e),
                metadata={"error_type": type(e).__name__}
            )
    
    def _determine_task_type(self, prompt: str) -> str:
        """Determine the type of task based on the prompt."""
        prompt_lower = prompt.lower()
        
        if "error" in prompt_lower or "fix" in prompt_lower:
            return "analyze_error"
        elif "act" in prompt_lower and "warning" in prompt_lower:
            return "fix_act_warnings"
        elif "validate" in prompt_lower and "environment" in prompt_lower:
            return "validate_environment"
        elif "performance" in prompt_lower or "slow" in prompt_lower:
            return "analyze_performance"
        elif "report" in prompt_lower:
            return "generate_report"
        else:
            return "general"
    
    async def _analyze_error(self, prompt: str, deps: TestDebugDeps) -> AgentResponse:
        """Analyze and fix test errors."""
        # Extract error details from prompt
        error_info = self._extract_error_info(prompt)
        
        # Analyze the error
        analysis = analyze_test_error(
            error_info["error"],
            error_info["file"],
            deps.test_files,
            deps.source_files
        )
        
        # Find related files
        related_files = find_related_files(
            error_info["file"],
            deps.test_files,
            deps.source_files
        )
        
        # Generate fix suggestions
        suggestions = generate_fix_suggestions(
            analysis,
            related_files,
            deps.mock_files
        )
        
        # Apply fixes if possible
        fixed_files = []
        if suggestions.get("auto_fixable"):
            fixed_files = await self._apply_fixes(
                suggestions["fixes"],
                deps
            )
        
        return AgentResponse(
            data={
                "analysis": analysis,
                "related_files": related_files,
                "suggestions": suggestions,
                "applied_fixes": fixed_files
            },
            success=True,
            suggestions=suggestions.get("manual_fixes", []),
            fixed_files=fixed_files,
            metadata={
                "error_type": analysis.get("error_type"),
                "severity": analysis.get("severity"),
                "timestamp": datetime.now().isoformat()
            }
        )
    
    async def _fix_act_warnings(self, prompt: str, deps: TestDebugDeps) -> AgentResponse:
        """Fix React act() warnings in tests."""
        # Extract file information
        file_path = self._extract_file_path(prompt)
        
        # Analyze act warnings
        analysis = analyze_act_warnings(
            file_path,
            deps.test_files.get(file_path, ""),
            deps.source_files
        )
        
        # Generate fixes
        fixes = []
        for warning in analysis["warnings"]:
            fix = {
                "type": warning["type"],
                "location": warning["location"],
                "fix_code": self._generate_act_fix(warning),
                "explanation": warning.get("explanation", "")
            }
            fixes.append(fix)
        
        # Apply fixes
        fixed_content = self._apply_act_fixes(
            deps.test_files.get(file_path, ""),
            fixes
        )
        
        return AgentResponse(
            data={
                "analysis": analysis,
                "fixes": fixes,
                "fixed_content": fixed_content
            },
            success=True,
            fixed_files=[file_path] if fixes else [],
            metadata={
                "warnings_found": len(analysis["warnings"]),
                "fixes_applied": len(fixes)
            }
        )
    
    async def _validate_environment(self, deps: TestDebugDeps) -> AgentResponse:
        """Validate the test environment setup."""
        validation_results = validate_test_environment(
            deps.package_json,
            deps.jest_config,
            deps.test_files
        )
        
        # Check mock consistency
        mock_issues = check_mock_consistency(
            deps.mock_files,
            deps.source_files
        )
        
        # Analyze test coverage
        coverage_analysis = analyze_test_coverage(
            deps.coverage_data,
            deps.source_files
        )
        
        recommendations = []
        
        # Generate recommendations based on validation
        if validation_results["issues"]:
            for issue in validation_results["issues"]:
                recommendations.append({
                    "type": issue["type"],
                    "severity": issue["severity"],
                    "recommendation": issue["recommendation"],
                    "code_example": issue.get("code_example", "")
                })
        
        return AgentResponse(
            data={
                "validation": validation_results,
                "mock_issues": mock_issues,
                "coverage": coverage_analysis,
                "recommendations": recommendations
            },
            success=True,
            suggestions=[r["recommendation"] for r in recommendations],
            metadata={
                "total_issues": len(validation_results["issues"]),
                "critical_issues": sum(1 for i in validation_results["issues"] if i["severity"] == "critical")
            }
        )
    
    async def _analyze_performance(self, prompt: str, deps: TestDebugDeps) -> AgentResponse:
        """Analyze test performance issues."""
        # Extract test patterns
        patterns = extract_test_patterns(deps.test_files)
        
        # Analyze timing errors
        timing_analysis = analyze_timing_errors(
            deps.test_files,
            deps.test_results
        )
        
        performance_recommendations = []
        
        # Check for common performance issues
        for pattern in patterns:
            if pattern["type"] == "slow_test":
                performance_recommendations.append({
                    "file": pattern["file"],
                    "issue": "Slow test detected",
                    "recommendation": "Consider using fake timers or mocking expensive operations",
                    "code_example": pattern.get("suggested_fix", "")
                })
        
        return AgentResponse(
            data={
                "patterns": patterns,
                "timing_analysis": timing_analysis,
                "recommendations": performance_recommendations
            },
            success=True,
            suggestions=[r["recommendation"] for r in performance_recommendations],
            metadata={
                "slow_tests": sum(1 for p in patterns if p["type"] == "slow_test"),
                "timing_issues": len(timing_analysis.get("issues", []))
            }
        )
    
    async def _generate_report(self, deps: TestDebugDeps) -> AgentResponse:
        """Generate a comprehensive test report."""
        report = generate_test_report(
            deps.test_files,
            deps.test_results,
            deps.coverage_data,
            self.fixed_issues
        )
        
        return AgentResponse(
            data=report,
            success=True,
            metadata={
                "report_type": "comprehensive",
                "generated_at": datetime.now().isoformat()
            }
        )
    
    async def _general_analysis(self, prompt: str, deps: TestDebugDeps) -> AgentResponse:
        """Handle general analysis requests."""
        # Extract test patterns
        patterns = extract_test_patterns(deps.test_files)
        
        # Find issues
        issues = []
        for pattern in patterns:
            if pattern["type"] in ["missing_cleanup", "improper_mock", "async_issue"]:
                issues.append(pattern)
        
        return AgentResponse(
            data={
                "patterns": patterns,
                "issues": issues,
                "summary": f"Found {len(issues)} potential issues in {len(deps.test_files)} test files"
            },
            success=True,
            suggestions=[issue.get("recommendation", "") for issue in issues],
            metadata={
                "total_patterns": len(patterns),
                "total_issues": len(issues)
            }
        )
    
    def _extract_error_info(self, prompt: str) -> Dict[str, Any]:
        """Extract error information from the prompt."""
        # Simple extraction logic - can be enhanced
        error_match = re.search(r'error:\s*(.+?)(?:\s+in\s+file|$)', prompt, re.IGNORECASE)
        file_match = re.search(r'file\s+(.+?)(?:\s|$)', prompt, re.IGNORECASE)
        
        return {
            "error": error_match.group(1) if error_match else "Unknown error",
            "file": file_match.group(1) if file_match else "Unknown file"
        }
    
    def _extract_file_path(self, prompt: str) -> str:
        """Extract file path from the prompt."""
        file_match = re.search(r'(?:file|in)\s+(.+\.tsx?)(?:\s|$)', prompt, re.IGNORECASE)
        return file_match.group(1) if file_match else ""
    
    def _generate_act_fix(self, warning: Dict[str, Any]) -> str:
        """Generate code fix for act warning."""
        warning_type = warning.get("type", "")
        
        if warning_type == "missing_act":
            return """await act(async () => {
  // Your state update here
});"""
        elif warning_type == "missing_waitfor":
            return """await waitFor(() => {
  expect(/* your assertion */).toBeTruthy();
});"""
        else:
            return "// Manual fix required"
    
    def _apply_act_fixes(self, content: str, fixes: List[Dict[str, Any]]) -> str:
        """Apply act fixes to the content."""
        lines = content.split('\n')
        
        # Apply fixes in reverse order to maintain line numbers
        for fix in sorted(fixes, key=lambda f: f["location"]["line"], reverse=True):
            line_num = fix["location"]["line"] - 1
            if 0 <= line_num < len(lines):
                indent = len(lines[line_num]) - len(lines[line_num].lstrip())
                fix_code = fix["fix_code"].replace('\n', '\n' + ' ' * indent)
                lines[line_num] = ' ' * indent + fix_code
        
        return '\n'.join(lines)
    
    async def _apply_fixes(self, fixes: List[Dict[str, Any]], deps: TestDebugDeps) -> List[str]:
        """Apply automatic fixes to files."""
        fixed_files = []
        
        for fix in fixes:
            if fix.get("auto_applicable"):
                file_path = fix["file"]
                # In a real implementation, this would write to the file
                # For now, we just track that it would be fixed
                fixed_files.append(file_path)
                self.fixed_issues.append({
                    "file": file_path,
                    "issue": fix.get("type", "unknown"),
                    "fix_applied": fix.get("fix", fix.get("code", "")),
                    "timestamp": datetime.now().isoformat()
                })
        
        return fixed_files

# Create a singleton instance
test_debug_agent = TestDebugAgent()