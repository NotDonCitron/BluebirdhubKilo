#!/usr/bin/env python3
"""
CLI Interface for Next-Generation Auto-Fixer
Command-line interface for running the auto-fixer with various options
"""

import os
import sys
import json
import argparse
import time
from pathlib import Path
from typing import Dict, List, Any

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from next_gen_auto_fixer import NextGenAutoFixer
from test_next_gen_fixer import TestNextGenAutoFixer, BenchmarkRunner

class AutoFixerCLI:
    """Command-line interface for the auto-fixer"""
    
    def __init__(self):
        self.fixer = NextGenAutoFixer()
        
    def create_parser(self) -> argparse.ArgumentParser:
        """Create command-line argument parser"""
        parser = argparse.ArgumentParser(
            description='Next-Generation Auto-Fixer for Test Files',
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog='''
Examples:
  %(prog)s fix ./app/__tests__                    # Fix all test files
  %(prog)s fix file.test.tsx --dry-run           # Preview fixes without applying
  %(prog)s analyze ./app/__tests__               # Analyze files only
  %(prog)s test                                  # Run test suite
  %(prog)s benchmark ./app/__tests__             # Run benchmark comparison
  %(prog)s stats                                 # Show processing statistics
            '''
        )
        
        subparsers = parser.add_subparsers(dest='command', help='Available commands')
        
        # Fix command
        fix_parser = subparsers.add_parser('fix', help='Fix test files')
        fix_parser.add_argument('path', help='File or directory to fix')
        fix_parser.add_argument('--dry-run', action='store_true', 
                               help='Preview fixes without applying them')
        fix_parser.add_argument('--pattern', default='**/*.test.*',
                               help='File pattern to match (default: **/*.test.*)')
        fix_parser.add_argument('--output', help='Output file for results (JSON)')
        fix_parser.add_argument('--verbose', '-v', action='store_true',
                               help='Verbose output')
        
        # Analyze command
        analyze_parser = subparsers.add_parser('analyze', help='Analyze files without fixing')
        analyze_parser.add_argument('path', help='File or directory to analyze')
        analyze_parser.add_argument('--pattern', default='**/*.test.*',
                                   help='File pattern to match')
        analyze_parser.add_argument('--output', help='Output file for analysis (JSON)')
        analyze_parser.add_argument('--engine', choices=['ast', 'typescript', 'ml', 'all'],
                                   default='all', help='Analysis engine to use')
        
        # Test command
        test_parser = subparsers.add_parser('test', help='Run test suite')
        test_parser.add_argument('--benchmark', action='store_true',
                                help='Include benchmark tests')
        
        # Benchmark command
        benchmark_parser = subparsers.add_parser('benchmark', help='Run benchmark comparison')
        benchmark_parser.add_argument('path', help='Directory to benchmark on')
        benchmark_parser.add_argument('--output', help='Output file for benchmark results')
        
        # Stats command
        subparsers.add_parser('stats', help='Show processing statistics')
        
        # Version command
        subparsers.add_parser('version', help='Show version information')
        
        return parser
    
    def fix_command(self, args) -> int:
        """Handle fix command"""
        path = Path(args.path)
        
        if not path.exists():
            print(f"❌ Error: Path '{path}' does not exist")
            return 1
        
        print(f"🔧 {'Analyzing' if args.dry_run else 'Fixing'} files in: {path}")
        print(f"📁 Pattern: {args.pattern}")
        print(f"🏃 Mode: {'Dry run' if args.dry_run else 'Apply fixes'}")
        
        start_time = time.time()
        
        try:
            if path.is_file():
                # Fix single file
                result = self.fixer.process_file(str(path), dry_run=args.dry_run)
                self._print_single_file_result(result, args.verbose)
                
                if args.output:
                    self._save_single_result(result, args.output)
                
            else:
                # Fix directory
                results = self.fixer.process_directory(str(path), args.pattern, args.dry_run)
                self._print_directory_results(results, args.verbose)
                
                if args.output:
                    self._save_directory_results(results, args.output)
            
            total_time = time.time() - start_time
            print(f"\n⏱️  Total processing time: {total_time:.2f}s")
            
            return 0
            
        except Exception as e:
            print(f"❌ Error during processing: {e}")
            if args.verbose:
                import traceback
                traceback.print_exc()
            return 1
    
    def analyze_command(self, args) -> int:
        """Handle analyze command"""
        path = Path(args.path)
        
        if not path.exists():
            print(f"❌ Error: Path '{path}' does not exist")
            return 1
        
        print(f"🔍 Analyzing files in: {path}")
        print(f"📁 Pattern: {args.pattern}")
        print(f"🧠 Engine: {args.engine}")
        
        try:
            if path.is_file():
                analysis_result = self._analyze_single_file(str(path), args.engine)
                self._print_analysis_result(analysis_result)
                
                if args.output:
                    with open(args.output, 'w') as f:
                        json.dump(analysis_result, f, indent=2, default=str)
            else:
                # Analyze directory - use dry run mode
                results = self.fixer.process_directory(str(path), args.pattern, dry_run=True)
                
                # Extract analysis information
                analysis_summary = {
                    'total_files': results['total_files'],
                    'files_with_issues': sum(1 for r in results['detailed_results'] if r['total_fixes'] > 0),
                    'total_issues': sum(r['total_fixes'] for r in results['detailed_results']),
                    'avg_confidence': results['avg_confidence'],
                    'files_needing_review': results['manual_review_needed'],
                    'detailed_analysis': results['detailed_results']
                }
                
                self._print_directory_analysis(analysis_summary)
                
                if args.output:
                    with open(args.output, 'w') as f:
                        json.dump(analysis_summary, f, indent=2, default=str)
            
            return 0
            
        except Exception as e:
            print(f"❌ Error during analysis: {e}")
            return 1
    
    def test_command(self, args) -> int:
        """Handle test command"""
        print("🧪 Running Next-Generation Auto-Fixer Test Suite")
        print("=" * 60)
        
        try:
            # Import and run tests
            import unittest
            from test_next_gen_fixer import TestNextGenAutoFixer
            
            test_suite = unittest.TestLoader().loadTestsFromTestCase(TestNextGenAutoFixer)
            test_runner = unittest.TextTestRunner(verbosity=2)
            test_result = test_runner.run(test_suite)
            
            if args.benchmark:
                print("\n🏁 Running Benchmark Tests")
                benchmark = BenchmarkRunner()
                
                # Use real test directory if available
                test_dir = "../app/__tests__"
                if os.path.exists(test_dir):
                    benchmark_results = benchmark.run_benchmark(test_dir)
                    benchmark.print_benchmark_results(benchmark_results)
                else:
                    print("Real test directory not found, skipping benchmark")
            
            if test_result.wasSuccessful():
                print("\n✅ All tests passed!")
                return 0
            else:
                print(f"\n❌ Tests failed: {len(test_result.failures)} failures, {len(test_result.errors)} errors")
                return 1
                
        except Exception as e:
            print(f"❌ Error running tests: {e}")
            return 1
    
    def benchmark_command(self, args) -> int:
        """Handle benchmark command"""
        path = Path(args.path)
        
        if not path.exists() or not path.is_dir():
            print(f"❌ Error: Directory '{path}' does not exist")
            return 1
        
        print(f"🏁 Running benchmark on: {path}")
        
        try:
            benchmark = BenchmarkRunner()
            results = benchmark.run_benchmark(str(path))
            benchmark.print_benchmark_results(results)
            
            if args.output:
                with open(args.output, 'w') as f:
                    json.dump(results, f, indent=2)
                print(f"\n💾 Benchmark results saved to: {args.output}")
            
            return 0
            
        except Exception as e:
            print(f"❌ Error running benchmark: {e}")
            return 1
    
    def stats_command(self, args) -> int:
        """Handle stats command"""
        stats = self.fixer.get_statistics()
        
        print("📊 Next-Generation Auto-Fixer Statistics")
        print("=" * 40)
        print(f"Files processed: {stats['files_processed']}")
        print(f"Total fixes applied: {stats['total_fixes_applied']}")
        print(f"Average confidence: {stats['avg_confidence']:.2f}")
        print(f"Average processing time: {stats['avg_processing_time']:.2f}s")
        print(f"Fixes per file: {stats['fixes_per_file']:.1f}")
        
        return 0
    
    def version_command(self, args) -> int:
        """Handle version command"""
        print("Next-Generation Auto-Fixer v1.0.0")
        print("Advanced AST + TypeScript + ML powered test file fixer")
        print("\nEngines:")
        print("  • AST Analyzer v1.0.0")
        print("  • TypeScript Analyzer v1.0.0")
        print("  • ML Context Engine v1.0.0")
        print("  • Enhanced Auto-Fixer v1.0.0")
        
        return 0
    
    def _analyze_single_file(self, file_path: str, engine: str) -> Dict[str, Any]:
        """Analyze a single file"""
        result = {
            'file': file_path,
            'engines': {}
        }
        
        if engine in ['ast', 'all']:
            from ast_analyzer import ASTAnalyzer
            ast_analyzer = ASTAnalyzer()
            analysis = ast_analyzer.analyze_file(file_path)
            result['engines']['ast'] = {
                'is_valid': analysis.is_valid,
                'syntax_errors': len(analysis.syntax_errors),
                'parse_time': analysis.parse_time,
                'file_type': analysis.file_type
            }
        
        if engine in ['typescript', 'all']:
            from typescript_analyzer import TypeScriptAnalyzer
            ts_analyzer = TypeScriptAnalyzer()
            analysis = ts_analyzer.analyze_file(file_path)
            result['engines']['typescript'] = {
                'is_valid': analysis.is_valid,
                'diagnostics': len(analysis.diagnostics),
                'type_definitions': len(analysis.type_definitions),
                'imports': len(analysis.imports),
                'analysis_time': analysis.analysis_time
            }
        
        if engine in ['ml', 'all']:
            from ml_context_engine import MLContextEngine
            with open(file_path, 'r') as f:
                content = f.read()
            ml_engine = MLContextEngine()
            context = ml_engine.analyze_context(content, file_path)
            result['engines']['ml'] = {
                'framework': context.framework,
                'test_type': context.test_type,
                'patterns': len(context.patterns),
                'complexity_score': context.complexity_score
            }
        
        return result
    
    def _print_single_file_result(self, result, verbose: bool):
        """Print results for a single file"""
        print(f"\n📄 File: {Path(result.file_path).name}")
        print(f"✅ Success: {result.success}")
        print(f"🔧 Total fixes: {result.total_fixes}")
        print(f"📊 Confidence: {result.confidence_score:.2f}")
        print(f"⏱️  Processing time: {result.processing_time:.3f}s")
        
        if result.manual_review_needed:
            print("⚠️  Manual review needed")
        
        if verbose:
            if result.syntax_fixes:
                print(f"\n🔨 Syntax fixes ({len(result.syntax_fixes)}):")
                for fix in result.syntax_fixes:
                    print(f"  • Line {fix.line}: {fix.description}")
            
            if result.type_fixes:
                print(f"\n🏷️  Type fixes ({len(result.type_fixes)}):")
                for fix in result.type_fixes:
                    print(f"  • Line {fix.line}: {fix.description}")
            
            if result.contextual_fixes:
                print(f"\n🧠 Contextual fixes ({len(result.contextual_fixes)}):")
                for fix in result.contextual_fixes:
                    print(f"  • Line {fix.line}: {fix.description}")
            
            if result.error_messages:
                print(f"\n❌ Issues:")
                for error in result.error_messages:
                    print(f"  • {error}")
    
    def _print_directory_results(self, results, verbose: bool):
        """Print results for directory processing"""
        print(f"\n📊 Processing Summary")
        print("=" * 30)
        print(f"Files processed: {results['total_files']}")
        print(f"Success rate: {results['summary']['success_rate']}")
        print(f"Total fixes applied: {results['summary']['total_fixes']}")
        print(f"Average confidence: {results['summary']['avg_confidence']}")
        print(f"Average time per file: {results['summary']['avg_time_per_file']}")
        print(f"Files needing review: {results['summary']['files_needing_review']}")
        
        if verbose:
            print(f"\n📋 Detailed Results:")
            for result in results['detailed_results']:
                status = "✅" if result['success'] else "❌"
                review = " ⚠️" if result['manual_review_needed'] else ""
                print(f"  {status} {Path(result['file']).name}: {result['total_fixes']} fixes{review}")
    
    def _print_analysis_result(self, result):
        """Print analysis results"""
        print(f"\n📄 Analysis: {Path(result['file']).name}")
        
        for engine, data in result['engines'].items():
            print(f"\n🔍 {engine.upper()} Analysis:")
            for key, value in data.items():
                print(f"  • {key}: {value}")
    
    def _print_directory_analysis(self, analysis):
        """Print directory analysis results"""
        print(f"\n📊 Analysis Summary")
        print("=" * 30)
        print(f"Total files: {analysis['total_files']}")
        print(f"Files with issues: {analysis['files_with_issues']}")
        print(f"Total issues found: {analysis['total_issues']}")
        print(f"Average confidence: {analysis['avg_confidence']:.2f}")
        print(f"Files needing review: {analysis['files_needing_review']}")
    
    def _save_single_result(self, result, output_path: str):
        """Save single file result"""
        # Convert result to JSON-serializable format
        result_dict = {
            'file_path': result.file_path,
            'success': result.success,
            'total_fixes': result.total_fixes,
            'confidence_score': result.confidence_score,
            'processing_time': result.processing_time,
            'manual_review_needed': result.manual_review_needed,
            'syntax_fixes': [
                {
                    'line': fix.line,
                    'description': fix.description,
                    'confidence': fix.confidence
                } for fix in result.syntax_fixes
            ],
            'type_fixes': [
                {
                    'line': fix.line,
                    'description': fix.description,
                    'confidence': fix.confidence
                } for fix in result.type_fixes
            ],
            'error_messages': result.error_messages
        }
        
        with open(output_path, 'w') as f:
            json.dump(result_dict, f, indent=2)
        
        print(f"💾 Results saved to: {output_path}")
    
    def _save_directory_results(self, results, output_path: str):
        """Save directory results"""
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"💾 Results saved to: {output_path}")
    
    def run(self, args=None):
        """Run the CLI"""
        parser = self.create_parser()
        parsed_args = parser.parse_args(args)
        
        if not parsed_args.command:
            parser.print_help()
            return 1
        
        # Route to appropriate command handler
        if parsed_args.command == 'fix':
            return self.fix_command(parsed_args)
        elif parsed_args.command == 'analyze':
            return self.analyze_command(parsed_args)
        elif parsed_args.command == 'test':
            return self.test_command(parsed_args)
        elif parsed_args.command == 'benchmark':
            return self.benchmark_command(parsed_args)
        elif parsed_args.command == 'stats':
            return self.stats_command(parsed_args)
        elif parsed_args.command == 'version':
            return self.version_command(parsed_args)
        else:
            parser.print_help()
            return 1

def main():
    """Main entry point"""
    cli = AutoFixerCLI()
    return cli.run()

if __name__ == "__main__":
    sys.exit(main())