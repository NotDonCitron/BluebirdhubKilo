#!/usr/bin/env python3
"""
Next-Generation Auto-Fixer
Combines AST analysis, TypeScript integration, and ML-powered context awareness
for intelligent code repair.
"""

import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Any

from ast_analyzer import ASTAnalyzer, ASTAnalysis, SyntaxError as ASTSyntaxError
from syntax_fix_generator import SyntaxFixGenerator, SyntaxFix, FixResult as SyntaxFixResult
from enhanced_auto_fixer import EnhancedAutoFixer, FixResult as EnhancedFixResult

logger = logging.getLogger(__name__)

@dataclass
class NextGenFixResult:
    """Result of next-generation auto-fixer processing"""
    success: bool
    file_path: str
    original_content: str
    fixed_content: str
    total_fixes: int
    confidence_score: float
    processing_time: float
    fixes_by_engine: Dict[str, List[str]] = field(default_factory=dict)
    ast_analysis: Optional[ASTAnalysis] = None
    manual_review_needed: bool = False
    errors_remaining: List[str] = field(default_factory=list)

@dataclass
class BatchProcessingResult:
    """Result of batch processing multiple files"""
    total_files: int
    files_processed: int
    files_fixed: int
    success_rate: float
    average_confidence: float
    average_processing_time: float
    total_fixes_applied: int
    manual_review_files: List[str] = field(default_factory=list)
    detailed_results: List[NextGenFixResult] = field(default_factory=list)

class NextGenAutoFixer:
    """Next-generation auto-fixer combining multiple engines"""
    
    def __init__(self):
        # Initialize component engines
        self.ast_analyzer = ASTAnalyzer()
        self.syntax_fix_generator = SyntaxFixGenerator()
        self.enhanced_fixer = EnhancedAutoFixer()
        
        # Configuration
        self.confidence_threshold = 0.8
        self.max_iterations = 3
        self.enable_ast_analysis = True
        self.enable_enhanced_fixes = True
        
        # Statistics
        self.total_files_processed = 0
        self.total_fixes_applied = 0
        
        logger.info("Next-Generation Auto-Fixer initialized")
    
    def process_file(self, file_path: str, dry_run: bool = True) -> NextGenFixResult:
        """Process a single file with all available engines"""
        start_time = time.time()
        
        try:
            # Read file content
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            current_content = original_content
            all_fixes = []
            fixes_by_engine = {}
            ast_analysis = None
            manual_review_needed = False
            errors_remaining = []
            
            # Phase 1: AST Analysis (if enabled)
            if self.enable_ast_analysis:
                try:
                    ast_analysis = self.ast_analyzer.analyze_with_content(file_path, current_content)
                    
                    # Apply AST-based fixes
                    ast_fixes = self.syntax_fix_generator.generate_fixes(ast_analysis, current_content)
                    if ast_fixes:
                        ast_fix_result = self.syntax_fix_generator.apply_fixes(current_content, ast_fixes)
                        if ast_fix_result.success:
                            current_content = ast_fix_result.fixed_content
                            ast_fix_descriptions = [f.description for f in ast_fix_result.fixes_applied]
                            all_fixes.extend(ast_fix_descriptions)
                            fixes_by_engine['ast'] = ast_fix_descriptions
                            
                            logger.info(f"AST engine applied {len(ast_fix_result.fixes_applied)} fixes")
                
                except Exception as e:
                    logger.warning(f"AST analysis failed for {file_path}: {e}")
                    errors_remaining.append(f"AST analysis error: {e}")
            
            # Phase 2: Enhanced Pattern-Based Fixes (if enabled)
            if self.enable_enhanced_fixes:
                try:
                    # Create temporary file for enhanced fixer
                    temp_file_path = file_path + '.temp'
                    with open(temp_file_path, 'w', encoding='utf-8') as f:
                        f.write(current_content)
                    
                    try:
                        enhanced_result = self.enhanced_fixer.fix_file(temp_file_path, dry_run=True)
                        if enhanced_result.success and enhanced_result.changes_made:
                            current_content = enhanced_result.file_content
                            all_fixes.extend(enhanced_result.changes_made)
                            fixes_by_engine['enhanced'] = enhanced_result.changes_made
                            
                            if enhanced_result.issues_found:
                                manual_review_needed = True
                                errors_remaining.extend(enhanced_result.issues_found)
                            
                            logger.info(f"Enhanced engine applied {len(enhanced_result.changes_made)} fixes")
                    finally:
                        # Clean up temp file
                        if os.path.exists(temp_file_path):
                            os.unlink(temp_file_path)
                
                except Exception as e:
                    logger.warning(f"Enhanced fixes failed for {file_path}: {e}")
                    errors_remaining.append(f"Enhanced fixes error: {e}")
            
            # Phase 3: Iterative Refinement
            if len(all_fixes) > 0 and self.max_iterations > 1:
                for iteration in range(1, self.max_iterations):
                    try:
                        # Re-analyze with AST to check for remaining issues
                        if self.enable_ast_analysis:
                            refined_analysis = self.ast_analyzer.analyze_with_content(file_path, current_content)
                            refined_fixes = self.syntax_fix_generator.generate_fixes(refined_analysis, current_content)
                            
                            if refined_fixes:
                                refined_result = self.syntax_fix_generator.apply_fixes(current_content, refined_fixes)
                                if refined_result.success:
                                    current_content = refined_result.fixed_content
                                    refined_descriptions = [f.description for f in refined_result.fixes_applied]
                                    all_fixes.extend(refined_descriptions)
                                    
                                    if f'ast_iteration_{iteration}' not in fixes_by_engine:
                                        fixes_by_engine[f'ast_iteration_{iteration}'] = []
                                    fixes_by_engine[f'ast_iteration_{iteration}'].extend(refined_descriptions)
                                    
                                    logger.info(f"Iteration {iteration}: Applied {len(refined_result.fixes_applied)} additional fixes")
                            else:
                                # No more fixes needed
                                break
                    except Exception as e:
                        logger.warning(f"Iteration {iteration} failed: {e}")
                        break
            
            # Calculate confidence score
            confidence_score = self._calculate_confidence(
                original_content, current_content, all_fixes, 
                ast_analysis, manual_review_needed, errors_remaining
            )
            
            # Apply changes if not dry run
            if not dry_run and current_content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(current_content)
                logger.info(f"Applied {len(all_fixes)} fixes to {file_path}")
            
            # Update statistics
            self.total_files_processed += 1
            self.total_fixes_applied += len(all_fixes)
            
            processing_time = time.time() - start_time
            
            return NextGenFixResult(
                success=len(all_fixes) > 0,
                file_path=file_path,
                original_content=original_content,
                fixed_content=current_content,
                total_fixes=len(all_fixes),
                confidence_score=confidence_score,
                processing_time=processing_time,
                fixes_by_engine=fixes_by_engine,
                ast_analysis=ast_analysis,
                manual_review_needed=manual_review_needed,
                errors_remaining=errors_remaining
            )
            
        except Exception as e:
            logger.error(f"Critical error processing {file_path}: {e}")
            return NextGenFixResult(
                success=False,
                file_path=file_path,
                original_content="",
                fixed_content="",
                total_fixes=0,
                confidence_score=0.0,
                processing_time=time.time() - start_time,
                errors_remaining=[f"Critical error: {e}"]
            )
    
    def _calculate_confidence(self, original: str, fixed: str, fixes: List[str], 
                            ast_analysis: Optional[ASTAnalysis], manual_review: bool, 
                            errors: List[str]) -> float:
        """Calculate confidence score for fixes"""
        if not fixes:
            return 1.0 if original == fixed else 0.0
        
        base_confidence = 0.9
        
        # Reduce confidence for manual review needed
        if manual_review:
            base_confidence -= 0.2
        
        # Reduce confidence for remaining errors
        if errors:
            base_confidence -= 0.1 * len(errors)
        
        # Increase confidence for successful AST analysis
        if ast_analysis and ast_analysis.is_valid:
            base_confidence += 0.1
        
        # Adjust based on number of fixes (too many might indicate instability)
        if len(fixes) > 10:
            base_confidence -= 0.1
        elif len(fixes) > 5:
            base_confidence -= 0.05
        
        return max(0.0, min(1.0, base_confidence))
    
    def process_directory(self, directory: str, dry_run: bool = True) -> BatchProcessingResult:
        """Process all test files in a directory"""
        start_time = time.time()
        
        # Find test files
        test_files = []
        directory_path = Path(directory)
        
        for pattern in ['**/*.test.tsx', '**/*.test.ts', '**/*.spec.tsx', '**/*.spec.ts']:
            test_files.extend(directory_path.glob(pattern))
        
        logger.info(f"Found {len(test_files)} test files to process")
        
        # Process each file
        results = []
        manual_review_files = []
        total_fixes = 0
        total_confidence = 0.0
        files_fixed = 0
        
        for file_path in test_files:
            result = self.process_file(str(file_path), dry_run)
            results.append(result)
            
            if result.success:
                files_fixed += 1
                total_fixes += result.total_fixes
                total_confidence += result.confidence_score
                
                if result.manual_review_needed:
                    manual_review_files.append(str(file_path))
        
        # Calculate statistics
        success_rate = files_fixed / len(test_files) if test_files else 0.0
        average_confidence = total_confidence / len(test_files) if test_files else 0.0
        average_processing_time = (time.time() - start_time) / len(test_files) if test_files else 0.0
        
        return BatchProcessingResult(
            total_files=len(test_files),
            files_processed=len(results),
            files_fixed=files_fixed,
            success_rate=success_rate,
            average_confidence=average_confidence,
            average_processing_time=average_processing_time,
            total_fixes_applied=total_fixes,
            manual_review_files=manual_review_files,
            detailed_results=results
        )
    
    def generate_report(self, batch_result: BatchProcessingResult, output_file: Optional[str] = None) -> Dict:
        """Generate comprehensive report"""
        report = {
            'summary': {
                'total_files': batch_result.total_files,
                'files_processed': batch_result.files_processed,
                'files_fixed': batch_result.files_fixed,
                'success_rate': f"{batch_result.success_rate:.1%}",
                'average_confidence': f"{batch_result.average_confidence:.2f}",
                'average_processing_time': f"{batch_result.average_processing_time:.2f}s",
                'total_fixes_applied': batch_result.total_fixes_applied,
                'manual_review_needed': len(batch_result.manual_review_files)
            },
            'detailed_results': []
        }
        
        for result in batch_result.detailed_results:
            detail = {
                'file_path': result.file_path,
                'success': result.success,
                'total_fixes': result.total_fixes,
                'confidence_score': result.confidence_score,
                'processing_time': result.processing_time,
                'fixes_by_engine': result.fixes_by_engine,
                'manual_review_needed': result.manual_review_needed,
                'errors_remaining': result.errors_remaining
            }
            report['detailed_results'].append(detail)
        
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2)
            logger.info(f"Report saved to {output_file}")
        
        return report

def main():
    """Main function for testing the next-generation auto-fixer"""
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Initialize fixer
    fixer = NextGenAutoFixer()
    
    # Process test files
    print("=== NEXT-GENERATION AUTO-FIXER ===")
    print("Processing test files...")
    
    batch_result = fixer.process_directory('../app/__tests__', dry_run=True)
    
    # Generate and display report
    report = fixer.generate_report(batch_result, 'next_gen_fix_report.json')
    
    print("\n=== RESULTS SUMMARY ===")
    for key, value in report['summary'].items():
        print(f"{key.replace('_', ' ').title()}: {value}")
    
    print(f"\nProcessed {batch_result.total_files} files")
    print(f"Success rate: {batch_result.success_rate:.1%}")
    print(f"Average confidence: {batch_result.average_confidence:.2f}")
    print(f"Total fixes applied: {batch_result.total_fixes_applied}")
    
    if batch_result.manual_review_files:
        print(f"\nFiles requiring manual review: {len(batch_result.manual_review_files)}")
        for file_path in batch_result.manual_review_files[:5]:  # Show first 5
            print(f"  - {file_path}")
    
    print("\nDetailed report saved to: next_gen_fix_report.json")

if __name__ == "__main__":
    main()