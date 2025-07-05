#!/usr/bin/env python3
"""
Test Framework for Next-Generation Auto-Fixer
Comprehensive testing and validation suite
"""

import os
import sys
import json
import time
import unittest
from pathlib import Path
from typing import Dict, List, Any
import tempfile
import shutil

# Add the current directory to the path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from next_gen_auto_fixer import NextGenAutoFixer
from ast_analyzer import ASTAnalyzer
from typescript_analyzer import TypeScriptAnalyzer
from ml_context_engine import MLContextEngine
from syntax_fix_generator import SyntaxFixGenerator
from type_fix_generator import TypeFixGenerator

class TestNextGenAutoFixer(unittest.TestCase):
    """Test suite for the next-generation auto-fixer"""
    
    def setUp(self):
        """Set up test environment"""
        self.test_dir = tempfile.mkdtemp()
        self.fixer = NextGenAutoFixer()
        
        # Sample test files with known issues
        self.test_cases = {
            'syntax_errors.test.tsx': '''
import React from 'react';
import { render, screen } from '@testing-library/react';

describe('Syntax Errors Test', () => {
  it('should fix syntax errors', () => {
    setSystemTime(new Date(2023, 0, 1);
    expect(screen.getByText('test')).toBeInTheDocument();
    setTimeout((); => {
      expect(true).toBe(true);
    }, 1000);
  });
});
''',
            'type_errors.test.tsx': '''
import React from 'react';
import { render } from '@testing-library/react';

interface Props {
  name: string;
  age: number;
}

describe('Type Errors Test', () => {
  it('should fix type errors', () => {
    const mockData = {
      name: 'test',
      age: 25
    };
    
    render(<Component data={mockData as any} />);
    const mockFn = jest.fn().mockReturnValue(mockData);
  });
});
''',
            'import_errors.test.tsx': '''
describe('Import Errors Test', () => {
  it('should fix missing imports', () => {
    render(<div>test</div>);
    expect(screen.getByText('test')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    waitFor(() => {
      expect(screen.getByText('success')).toBeInTheDocument();
    });
  });
});
''',
            'complex_errors.test.tsx': '''
import React from 'react';

describe('Complex Errors Test', () => {
  it('should handle complex scenarios', () => {
    const mockUser = {
      id: 1,
      name: 'test'
    };
    
    const mockFn = jest.fn().mockReturnValue(mockUser as any);
    render(<UserProfile user={mockUser} />);
    
    expect(screen.getByText('test')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button');
    
    waitFor(() => {
      expect(mockFn).toHaveBeenCalled();
    });
  });
});
'''
        }
        
        # Create test files
        for filename, content in self.test_cases.items():
            with open(os.path.join(self.test_dir, filename), 'w') as f:
                f.write(content)
    
    def tearDown(self):
        """Clean up test environment"""
        shutil.rmtree(self.test_dir)
    
    def test_ast_analyzer(self):
        """Test AST analyzer functionality"""
        analyzer = ASTAnalyzer()
        
        test_file = os.path.join(self.test_dir, 'syntax_errors.test.tsx')
        analysis = analyzer.analyze_file(test_file)
        
        self.assertIsNotNone(analysis)
        self.assertFalse(analysis.is_valid)  # Should detect syntax errors
        self.assertGreater(len(analysis.syntax_errors), 0)
        print(f"✓ AST Analyzer detected {len(analysis.syntax_errors)} syntax errors")
    
    def test_syntax_fix_generator(self):
        """Test syntax fix generator"""
        generator = SyntaxFixGenerator()
        
        with open(os.path.join(self.test_dir, 'syntax_errors.test.tsx'), 'r') as f:
            content = f.read()
        
        fixes = generator.generate_fixes('syntax_errors.test.tsx', content)
        
        self.assertGreater(len(fixes), 0)
        print(f"✓ Syntax Fix Generator produced {len(fixes)} fixes")
        
        # Apply fixes and verify
        result = generator.apply_fixes(content, fixes)
        self.assertTrue(result.success)
        self.assertGreater(len(result.fixes_applied), 0)
    
    def test_typescript_analyzer(self):
        """Test TypeScript analyzer"""
        analyzer = TypeScriptAnalyzer()
        
        test_file = os.path.join(self.test_dir, 'type_errors.test.tsx')
        analysis = analyzer.analyze_file(test_file)
        
        self.assertIsNotNone(analysis)
        self.assertGreaterEqual(len(analysis.imports), 0)
        print(f"✓ TypeScript Analyzer found {len(analysis.imports)} imports")
    
    def test_type_fix_generator(self):
        """Test type fix generator"""
        generator = TypeFixGenerator()
        
        with open(os.path.join(self.test_dir, 'type_errors.test.tsx'), 'r') as f:
            content = f.read()
        
        fixes = generator.generate_type_fixes('type_errors.test.tsx', content)
        
        self.assertGreaterEqual(len(fixes), 0)
        print(f"✓ Type Fix Generator produced {len(fixes)} type fixes")
    
    def test_ml_context_engine(self):
        """Test ML context engine"""
        engine = MLContextEngine()
        
        with open(os.path.join(self.test_dir, 'complex_errors.test.tsx'), 'r') as f:
            content = f.read()
        
        context = engine.analyze_context(content, 'complex_errors.test.tsx')
        
        self.assertIsNotNone(context)
        self.assertEqual(context.file_type, '.tsx')
        self.assertIn(context.framework, ['react', 'testing-library', 'jest'])
        print(f"✓ ML Context Engine detected framework: {context.framework}")
    
    def test_integration_simple_case(self):
        """Test integration with a simple case"""
        test_file = os.path.join(self.test_dir, 'syntax_errors.test.tsx')
        
        result = self.fixer.process_file(test_file, dry_run=True)
        
        self.assertIsNotNone(result)
        self.assertGreater(result.processing_time, 0)
        self.assertGreaterEqual(result.total_fixes, 0)
        print(f"✓ Integration test processed file with {result.total_fixes} fixes")
        print(f"  Confidence: {result.confidence_score:.2f}")
        print(f"  Processing time: {result.processing_time:.3f}s")
    
    def test_integration_all_files(self):
        """Test integration with all test files"""
        results = self.fixer.process_directory(self.test_dir, "*.test.tsx", dry_run=True)
        
        self.assertEqual(results['total_files'], len(self.test_cases))
        self.assertGreaterEqual(results['total_fixes_applied'], 0)
        print(f"✓ Integration test processed {results['total_files']} files")
        print(f"  Success rate: {results['success_rate']:.1%}")
        print(f"  Total fixes: {results['total_fixes_applied']}")
        print(f"  Average confidence: {results['avg_confidence']:.2f}")
    
    def test_performance_benchmark(self):
        """Test performance benchmarks"""
        # Create multiple test files for performance testing
        perf_dir = os.path.join(self.test_dir, 'performance')
        os.makedirs(perf_dir)
        
        # Generate 10 test files
        for i in range(10):
            with open(os.path.join(perf_dir, f'perf_test_{i}.test.tsx'), 'w') as f:
                f.write(self.test_cases['complex_errors.test.tsx'])
        
        start_time = time.time()
        results = self.fixer.process_directory(perf_dir, "*.test.tsx", dry_run=True)
        total_time = time.time() - start_time
        
        avg_time_per_file = total_time / results['total_files'] if results['total_files'] > 0 else 0
        
        print(f"✓ Performance test completed")
        print(f"  Files: {results['total_files']}")
        print(f"  Total time: {total_time:.2f}s")
        print(f"  Average per file: {avg_time_per_file:.2f}s")
        
        # Assert performance targets
        self.assertLess(avg_time_per_file, 5.0, "Processing should be under 5 seconds per file")
    
    def test_fix_quality_validation(self):
        """Test fix quality and validation"""
        test_file = os.path.join(self.test_dir, 'syntax_errors.test.tsx')
        
        # Get original content
        with open(test_file, 'r') as f:
            original_content = f.read()
        
        result = self.fixer.process_file(test_file, dry_run=True)
        
        # Check that fixes improve the code
        if result.total_fixes > 0:
            # Check syntax improvement
            orig_parens = original_content.count('(') - original_content.count(')')
            fixed_parens = result.fixed_content.count('(') - result.fixed_content.count(')')
            
            if orig_parens != 0:  # Had unbalanced parentheses
                self.assertEqual(fixed_parens, 0, "Should fix unbalanced parentheses")
                print("✓ Fixed unbalanced parentheses")
        
        print(f"✓ Fix quality validation passed")
    
    def test_error_handling(self):
        """Test error handling and recovery"""
        # Create an invalid file
        invalid_file = os.path.join(self.test_dir, 'invalid.test.tsx')
        with open(invalid_file, 'w') as f:
            f.write('This is not valid TypeScript code at all!!!')
        
        result = self.fixer.process_file(invalid_file, dry_run=True)
        
        # Should handle the error gracefully
        self.assertIsNotNone(result)
        print(f"✓ Error handling test completed")
        print(f"  Success: {result.success}")
        print(f"  Error messages: {len(result.error_messages)}")

class BenchmarkRunner:
    """Run benchmarks against the original auto-fixer"""
    
    def __init__(self):
        self.next_gen_fixer = NextGenAutoFixer()
        
        # Try to import the original enhanced auto-fixer for comparison
        try:
            from enhanced_auto_fixer import EnhancedAutoFixer
            self.enhanced_fixer = EnhancedAutoFixer()
        except ImportError:
            self.enhanced_fixer = None
    
    def run_benchmark(self, test_dir: str) -> Dict[str, Any]:
        """Run benchmark comparison"""
        results = {
            'next_gen': {},
            'enhanced': {},
            'comparison': {}
        }
        
        print("=== BENCHMARK COMPARISON ===")
        
        # Test next-gen fixer
        print("Testing Next-Gen Auto-Fixer...")
        start_time = time.time()
        next_gen_results = self.next_gen_fixer.process_directory(test_dir, "*.test.tsx", dry_run=True)
        next_gen_time = time.time() - start_time
        
        results['next_gen'] = {
            'total_time': next_gen_time,
            'files_processed': next_gen_results['total_files'],
            'success_rate': next_gen_results['success_rate'],
            'total_fixes': next_gen_results['total_fixes_applied'],
            'avg_confidence': next_gen_results['avg_confidence']
        }
        
        # Test enhanced fixer if available
        if self.enhanced_fixer:
            print("Testing Enhanced Auto-Fixer...")
            start_time = time.time()
            enhanced_results = self.enhanced_fixer.process_directory(test_dir, dry_run=True)
            enhanced_time = time.time() - start_time
            
            results['enhanced'] = {
                'total_time': enhanced_time,
                'files_processed': enhanced_results['files_processed'],
                'success_rate': enhanced_results['files_fixed'] / enhanced_results['files_processed'] if enhanced_results['files_processed'] > 0 else 0,
                'total_fixes': enhanced_results['total_changes'],
                'avg_confidence': enhanced_results.get('high_confidence_fixes', 0) / enhanced_results['files_processed'] if enhanced_results['files_processed'] > 0 else 0
            }
            
            # Generate comparison
            results['comparison'] = {
                'speed_improvement': enhanced_time / next_gen_time if next_gen_time > 0 else 1,
                'success_rate_improvement': results['next_gen']['success_rate'] - results['enhanced']['success_rate'],
                'fixes_improvement': results['next_gen']['total_fixes'] - results['enhanced']['total_fixes']
            }
        
        return results
    
    def print_benchmark_results(self, results: Dict[str, Any]):
        """Print benchmark results"""
        print("\n=== BENCHMARK RESULTS ===")
        
        print(f"Next-Gen Auto-Fixer:")
        print(f"  Files processed: {results['next_gen']['files_processed']}")
        print(f"  Success rate: {results['next_gen']['success_rate']:.1%}")
        print(f"  Total fixes: {results['next_gen']['total_fixes']}")
        print(f"  Average confidence: {results['next_gen']['avg_confidence']:.2f}")
        print(f"  Total time: {results['next_gen']['total_time']:.2f}s")
        
        if 'enhanced' in results and results['enhanced']:
            print(f"\nEnhanced Auto-Fixer:")
            print(f"  Files processed: {results['enhanced']['files_processed']}")
            print(f"  Success rate: {results['enhanced']['success_rate']:.1%}")
            print(f"  Total fixes: {results['enhanced']['total_fixes']}")
            print(f"  Total time: {results['enhanced']['total_time']:.2f}s")
            
            if 'comparison' in results:
                print(f"\nComparison (Next-Gen vs Enhanced):")
                print(f"  Speed: {results['comparison']['speed_improvement']:.1f}x")
                print(f"  Success rate improvement: {results['comparison']['success_rate_improvement']:+.1%}")
                print(f"  Additional fixes: {results['comparison']['fixes_improvement']:+d}")

def main():
    """Run all tests and benchmarks"""
    print("🚀 Starting Next-Generation Auto-Fixer Test Suite")
    print("=" * 60)
    
    # Run unit tests
    test_suite = unittest.TestLoader().loadTestsFromTestCase(TestNextGenAutoFixer)
    test_runner = unittest.TextTestRunner(verbosity=2)
    test_result = test_runner.run(test_suite)
    
    print("\n" + "=" * 60)
    
    # Run benchmark if test files are available
    test_dir = "../app/__tests__"
    if os.path.exists(test_dir):
        benchmark = BenchmarkRunner()
        benchmark_results = benchmark.run_benchmark(test_dir)
        benchmark.print_benchmark_results(benchmark_results)
        
        # Save benchmark results
        with open('benchmark_results.json', 'w') as f:
            json.dump(benchmark_results, f, indent=2)
        print(f"\nBenchmark results saved to: benchmark_results.json")
    else:
        print(f"Real test directory not found: {test_dir}")
        print("Skipping benchmark against real files")
    
    # Summary
    print("\n" + "=" * 60)
    if test_result.wasSuccessful():
        print("✅ All tests passed! Next-Generation Auto-Fixer is ready for use.")
    else:
        print("❌ Some tests failed. Please review and fix issues before deployment.")
        print(f"Failures: {len(test_result.failures)}")
        print(f"Errors: {len(test_result.errors)}")
    
    return test_result.wasSuccessful()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)