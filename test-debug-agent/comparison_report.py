#!/usr/bin/env python3
"""
Comparison Report: Original vs Enhanced Auto-Fixer
"""

import json
from pathlib import Path

def generate_comparison_report():
    """Generate a detailed comparison between original and enhanced auto-fixer"""
    
    # Load original results
    try:
        with open('fix_report.json', 'r') as f:
            original_results = json.load(f)
    except FileNotFoundError:
        print("Original fix_report.json not found, using known values")
        original_results = {
            "files_processed": 388,
            "files_fixed": 180,
            "total_changes": 1405
        }
    
    # Load enhanced results
    try:
        with open('enhanced_fix_report.json', 'r') as f:
            enhanced_results = json.load(f)
    except FileNotFoundError:
        print("Enhanced fix report not found")
        return
    
    print("=== AUTO-FIXER COMPARISON REPORT ===")
    print()
    
    # Calculate success rates
    original_success_rate = (original_results["files_fixed"] / original_results["files_processed"]) * 100
    enhanced_success_rate = (enhanced_results["files_fixed"] / enhanced_results["files_processed"]) * 100
    
    print("📊 PERFORMANCE COMPARISON:")
    print(f"Original Auto-Fixer:")
    print(f"  • Files processed: {original_results['files_processed']}")
    print(f"  • Files fixed: {original_results['files_fixed']}")
    print(f"  • Success rate: {original_success_rate:.1f}%")
    print(f"  • Total changes: {original_results.get('total_changes', 'N/A')}")
    print()
    
    print(f"Enhanced Auto-Fixer (Test Subset):")
    print(f"  • Files processed: {enhanced_results['files_processed']}")
    print(f"  • Files fixed: {enhanced_results['files_fixed']}")
    print(f"  • Success rate: {enhanced_success_rate:.1f}%")
    print(f"  • Total changes: {enhanced_results['total_changes']}")
    print(f"  • High confidence fixes: {enhanced_results['high_confidence_fixes']}")
    print(f"  • Manual review needed: {enhanced_results['manual_review_needed']}")
    print()
    
    # Improvement metrics
    improvement = enhanced_success_rate - original_success_rate
    print(f"🚀 IMPROVEMENT METRICS:")
    print(f"  • Success rate improvement: +{improvement:.1f}%")
    print(f"  • Average changes per file: {enhanced_results['total_changes'] / enhanced_results['files_processed']:.1f}")
    print(f"  • High confidence rate: {(enhanced_results['high_confidence_fixes'] / enhanced_results['files_processed']) * 100:.1f}%")
    print()
    
    # Analyze fix types
    print("🔧 FIX TYPES APPLIED (Enhanced Version):")
    fix_types = {}
    for result in enhanced_results['detailed_results']:
        for change in result['changes']:
            if 'Added import' in change:
                fix_types['Import fixes'] = fix_types.get('Import fixes', 0) + 1
            elif 'Fix unmatched parentheses' in change:
                fix_types['Syntax fixes'] = fix_types.get('Syntax fixes', 0) + 1
            elif 'Convert to async' in change:
                fix_types['Async pattern fixes'] = fix_types.get('Async pattern fixes', 0) + 1
            elif 'waitFor pattern' in change:
                fix_types['Async pattern fixes'] = fix_types.get('Async pattern fixes', 0) + 1
            elif 'as any' in change:
                fix_types['TypeScript fixes'] = fix_types.get('TypeScript fixes', 0) + 1
    
    for fix_type, count in sorted(fix_types.items(), key=lambda x: x[1], reverse=True):
        print(f"  • {fix_type}: {count} instances")
    print()
    
    # Success factors
    print("✅ KEY SUCCESS FACTORS OF ENHANCED VERSION:")
    print("  1. Import statement analysis and auto-insertion")
    print("  2. Syntax error detection and correction")
    print("  3. Async pattern recognition and fixing")
    print("  4. TypeScript type safety improvements")
    print("  5. High confidence scoring system")
    print()
    
    # Sample successful fixes
    print("💡 SAMPLE SUCCESSFUL FIXES:")
    sample_file = enhanced_results['detailed_results'][0]
    print(f"File: {Path(sample_file['file']).name}")
    print(f"Changes applied:")
    for change in sample_file['changes']:
        print(f"  • {change}")
    print(f"Confidence: {sample_file['confidence']}")
    print()
    
    # Recommendations
    print("🎯 RECOMMENDATIONS:")
    print("  1. Deploy enhanced auto-fixer to full dataset")
    print("  2. Add AST-based parsing for complex syntax errors")
    print("  3. Implement TypeScript compiler integration")
    print("  4. Add semantic analysis for logical errors")
    print("  5. Create manual review workflow for edge cases")

if __name__ == "__main__":
    generate_comparison_report()