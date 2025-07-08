#!/usr/bin/env python3
"""
Deployment Script: Enhanced Auto-Fixer
Applies the enhanced auto-fixer to the full dataset to resolve remaining unfixed files
"""

import json
import sys
from pathlib import Path
from enhanced_auto_fixer import EnhancedAutoFixer

def deploy_to_full_dataset():
    """Deploy enhanced auto-fixer to the full dataset"""
    
    print("🚀 DEPLOYING ENHANCED AUTO-FIXER TO FULL DATASET")
    print("=" * 60)
    
    # Initialize the enhanced fixer
    fixer = EnhancedAutoFixer()
    
    # First, run in dry-run mode to assess impact
    print("Phase 1: Dry-run analysis...")
    dry_run_results = fixer.process_directory('../app/__tests__', dry_run=True)
    
    # Display dry-run results
    print("\n📊 DRY-RUN RESULTS:")
    print(f"  • Total files found: {dry_run_results['total_files']}")
    print(f"  • Files that would be fixed: {dry_run_results['files_fixed']}")
    print(f"  • Total changes planned: {dry_run_results['total_changes']}")
    print(f"  • High confidence fixes: {dry_run_results['high_confidence_fixes']}")
    print(f"  • Files needing manual review: {dry_run_results['manual_review_needed']}")
    print(f"  • Projected success rate: {(dry_run_results['files_fixed'] / dry_run_results['total_files']) * 100:.1f}%")
    
    # Calculate improvement potential
    original_unfixed = 208  # From our previous analysis
    potential_newly_fixed = dry_run_results['files_fixed']
    
    print(f"\n🎯 IMPROVEMENT POTENTIAL:")
    print(f"  • Previously unfixed files: {original_unfixed}")
    print(f"  • Files enhanced fixer can fix: {potential_newly_fixed}")
    print(f"  • Potential reduction in unfixed files: {(potential_newly_fixed / original_unfixed) * 100:.1f}%")
    
    # Show sample fixes
    print(f"\n💡 SAMPLE PLANNED FIXES:")
    for i, result in enumerate(dry_run_results['detailed_results'][:3]):
        if result['success']:
            file_name = Path(result['file']).name
            print(f"  {i+1}. {file_name}")
            print(f"     • Confidence: {result['confidence']}")
            print(f"     • Changes: {len(result['changes'])}")
            for change in result['changes'][:2]:  # Show first 2 changes
                print(f"       - {change}")
            if len(result['changes']) > 2:
                print(f"       ... and {len(result['changes']) - 2} more")
            print()
    
    # Ask for confirmation
    print("⚠️  DEPLOYMENT CONFIRMATION:")
    print("   The enhanced auto-fixer is ready to process the full dataset.")
    print("   This would apply actual changes to the test files.")
    print("   Run with --execute flag to proceed with actual fixes.")
    print()
    
    # Save dry-run results for reference
    with open('full_dataset_dry_run.json', 'w') as f:
        json.dump(dry_run_results, f, indent=2)
    
    print("📄 Dry-run results saved to 'full_dataset_dry_run.json'")
    
    # Check if execution is requested
    if '--execute' in sys.argv:
        print("\n🔧 EXECUTING REAL FIXES...")
        real_results = fixer.process_directory('../app/__tests__', dry_run=False)
        
        print("\n✅ EXECUTION COMPLETE!")
        print(f"  • Files actually fixed: {real_results['files_fixed']}")
        print(f"  • Total changes applied: {real_results['total_changes']}")
        print(f"  • Success rate: {(real_results['files_fixed'] / real_results['total_files']) * 100:.1f}%")
        
        # Save real results
        with open('full_dataset_results.json', 'w') as f:
            json.dump(real_results, f, indent=2)
        
        print("📄 Execution results saved to 'full_dataset_results.json'")
        
        # Generate final comparison
        print("\n📈 BEFORE vs AFTER COMPARISON:")
        original_success_rate = (180 / 388) * 100
        new_success_rate = (real_results['files_fixed'] / real_results['total_files']) * 100
        improvement = new_success_rate - original_success_rate
        
        print(f"  • Original success rate: {original_success_rate:.1f}%")
        print(f"  • New success rate: {new_success_rate:.1f}%")
        print(f"  • Improvement: +{improvement:.1f}%")
        
        remaining_unfixed = real_results['total_files'] - real_results['files_fixed']
        print(f"  • Remaining unfixed files: {remaining_unfixed}")
        
        if remaining_unfixed > 0:
            print(f"\n🔍 REMAINING ISSUES ANALYSIS:")
            print(f"   {remaining_unfixed} files still need manual attention")
            print(f"   These likely require advanced AST parsing or semantic analysis")
    
    else:
        print("\n📋 NEXT STEPS:")
        print("   1. Review the dry-run results in 'full_dataset_dry_run.json'")
        print("   2. Run with --execute flag to apply actual fixes:")
        print("      python deploy_enhanced_fixer.py --execute")
        print("   3. Monitor results and handle any remaining edge cases")

if __name__ == "__main__":
    deploy_to_full_dataset()