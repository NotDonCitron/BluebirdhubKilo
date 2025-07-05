#!/usr/bin/env python3
"""
ML Context Engine Module for Next-Generation Auto-Fixer
Phase 3: Machine Learning Integration

This module provides context-aware fix suggestions using machine learning,
pattern recognition, and code embeddings for intelligent fix recommendations.
"""

import re
import json
import pickle
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import logging
import numpy as np
from collections import defaultdict, Counter

logger = logging.getLogger(__name__)

@dataclass
class CodeContext:
    """Represents the context of a code piece"""
    file_type: str
    framework: str  # 'react', 'jest', 'typescript', etc.
    patterns: List[str]
    imports: List[str]
    functions: List[str]
    variables: List[str]
    test_type: str  # 'unit', 'integration', 'component'
    complexity_score: float

@dataclass
class ContextPattern:
    """A learned pattern from successful fixes"""
    pattern_id: str
    context_features: Dict[str, Any]
    fix_type: str
    success_rate: float
    confidence: float
    examples: List[str]

@dataclass
class ContextualFix:
    """A fix suggestion with context information"""
    line: int
    column: int
    fix_type: str
    old_text: str
    new_text: str
    description: str
    confidence: float
    context_match: float
    similar_patterns: List[str]
    reasoning: str

class CodeEmbeddings:
    """Simple code embeddings using TF-IDF-like approach"""
    
    def __init__(self):
        self.vocabulary = {}
        self.idf_scores = {}
        self.is_fitted = False
    
    def _tokenize_code(self, code: str) -> List[str]:
        """Tokenize code into meaningful tokens"""
        # Remove comments and strings
        code = re.sub(r'//.*?$', '', code, flags=re.MULTILINE)
        code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
        code = re.sub(r'[\'"`].*?[\'"`]', 'STRING', code)
        
        # Extract meaningful tokens
        tokens = []
        
        # Keywords and identifiers
        tokens.extend(re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', code))
        
        # Function calls
        tokens.extend([m.group(1) for m in re.finditer(r'(\w+)\s*\(', code)])
        
        # Property access
        tokens.extend([m.group(1) for m in re.finditer(r'\.(\w+)', code)])
        
        # Import patterns
        tokens.extend(re.findall(r'from\s+[\'"]([^\'"]+)[\'"]', code))
        
        return [token.lower() for token in tokens if len(token) > 1]
    
    def fit(self, code_samples: List[str]):
        """Fit the embeddings model on code samples"""
        all_tokens = []
        doc_tokens = []
        
        for code in code_samples:
            tokens = self._tokenize_code(code)
            all_tokens.extend(tokens)
            doc_tokens.append(set(tokens))
        
        # Build vocabulary
        token_counts = Counter(all_tokens)
        self.vocabulary = {token: idx for idx, (token, _) in enumerate(token_counts.most_common(1000))}
        
        # Calculate IDF scores
        num_docs = len(doc_tokens)
        for token in self.vocabulary:
            doc_freq = sum(1 for doc in doc_tokens if token in doc)
            self.idf_scores[token] = np.log(num_docs / (doc_freq + 1))
        
        self.is_fitted = True
    
    def encode(self, code: str) -> np.ndarray:
        """Encode code into embedding vector"""
        if not self.is_fitted:
            return np.zeros(len(self.vocabulary))
        
        tokens = self._tokenize_code(code)
        token_counts = Counter(tokens)
        
        # Create TF-IDF vector
        vector = np.zeros(len(self.vocabulary))
        total_tokens = len(tokens)
        
        for token, count in token_counts.items():
            if token in self.vocabulary:
                tf = count / total_tokens if total_tokens > 0 else 0
                idf = self.idf_scores.get(token, 0)
                vector[self.vocabulary[token]] = tf * idf
        
        # Normalize
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        
        return vector
    
    def similarity(self, code1: str, code2: str) -> float:
        """Calculate similarity between two code pieces"""
        vec1 = self.encode(code1)
        vec2 = self.encode(code2)
        return np.dot(vec1, vec2)

class PatternClassifier:
    """Classify code patterns for fix suggestion"""
    
    def __init__(self):
        self.patterns = {}
        self.pattern_fixes = {}
    
    def learn_pattern(self, code: str, fix_type: str, success: bool):
        """Learn from a fix pattern"""
        pattern_hash = self._extract_pattern_hash(code)
        
        if pattern_hash not in self.patterns:
            self.patterns[pattern_hash] = {
                'total_attempts': 0,
                'successes': 0,
                'fix_types': defaultdict(int),
                'examples': []
            }
        
        pattern = self.patterns[pattern_hash]
        pattern['total_attempts'] += 1
        if success:
            pattern['successes'] += 1
        pattern['fix_types'][fix_type] += 1
        pattern['examples'].append(code[:200])  # Store snippet
    
    def predict_fix_type(self, code: str) -> Tuple[str, float]:
        """Predict the best fix type for given code"""
        pattern_hash = self._extract_pattern_hash(code)
        
        if pattern_hash in self.patterns:
            pattern = self.patterns[pattern_hash]
            success_rate = pattern['successes'] / pattern['total_attempts']
            best_fix = max(pattern['fix_types'].items(), key=lambda x: x[1])
            return best_fix[0], success_rate
        
        # Default prediction based on heuristics
        return self._heuristic_prediction(code)
    
    def _extract_pattern_hash(self, code: str) -> str:
        """Extract a hash representing the code pattern"""
        # Normalize code for pattern matching
        normalized = re.sub(r'\b\w+\b', 'VAR', code)  # Replace variables
        normalized = re.sub(r'\d+', 'NUM', normalized)  # Replace numbers
        normalized = re.sub(r'[\'"`].*?[\'"`]', 'STR', normalized)  # Replace strings
        normalized = re.sub(r'\s+', ' ', normalized).strip()  # Normalize whitespace
        
        return hashlib.md5(normalized.encode()).hexdigest()[:16]
    
    def _heuristic_prediction(self, code: str) -> Tuple[str, float]:
        """Heuristic-based fix type prediction"""
        if 'expect(' in code:
            return 'assertion_fix', 0.7
        elif 'import' in code:
            return 'import_fix', 0.8
        elif 'async' in code or 'await' in code:
            return 'async_fix', 0.75
        elif 'mock' in code.lower():
            return 'mock_fix', 0.8
        elif '(' in code and ')' not in code:
            return 'syntax_fix', 0.9
        else:
            return 'general_fix', 0.5

class MLContextEngine:
    """Main ML context engine for intelligent fix suggestions"""
    
    def __init__(self, model_dir: str = './ml_models'):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        
        self.embeddings = CodeEmbeddings()
        self.pattern_classifier = PatternClassifier()
        self.context_patterns = {}
        self.fix_history = []
        
        # Load existing models
        self._load_models()
    
    def analyze_context(self, code: str, file_path: str) -> CodeContext:
        """Analyze the context of a code piece"""
        file_path_obj = Path(file_path)
        
        # Determine file type and framework
        file_type = file_path_obj.suffix
        framework = self._detect_framework(code)
        
        # Extract patterns
        patterns = self._extract_patterns(code)
        
        # Extract imports, functions, variables
        imports = self._extract_imports(code)
        functions = self._extract_functions(code)
        variables = self._extract_variables(code)
        
        # Determine test type
        test_type = self._classify_test_type(code, file_path)
        
        # Calculate complexity
        complexity_score = self._calculate_complexity(code)
        
        return CodeContext(
            file_type=file_type,
            framework=framework,
            patterns=patterns,
            imports=imports,
            functions=functions,
            variables=variables,
            test_type=test_type,
            complexity_score=complexity_score
        )
    
    def suggest_contextual_fixes(self, code: str, file_path: str, available_fixes: List[Dict]) -> List[ContextualFix]:
        """Suggest fixes based on context analysis"""
        context = self.analyze_context(code, file_path)
        contextual_fixes = []
        
        for fix in available_fixes:
            # Calculate context match
            context_match = self._calculate_context_match(fix, context)
            
            # Get ML confidence
            ml_confidence = self._get_ml_confidence(fix, context, code)
            
            # Find similar patterns
            similar_patterns = self._find_similar_patterns(code, fix['fix_type'])
            
            # Generate reasoning
            reasoning = self._generate_reasoning(fix, context, similar_patterns)
            
            contextual_fix = ContextualFix(
                line=fix.get('line', 1),
                column=fix.get('column', 1),
                fix_type=fix.get('fix_type', 'unknown'),
                old_text=fix.get('old_text', ''),
                new_text=fix.get('new_text', ''),
                description=fix.get('description', ''),
                confidence=ml_confidence,
                context_match=context_match,
                similar_patterns=similar_patterns,
                reasoning=reasoning
            )
            
            contextual_fixes.append(contextual_fix)
        
        # Sort by combined confidence and context match
        contextual_fixes.sort(
            key=lambda x: x.confidence * 0.7 + x.context_match * 0.3,
            reverse=True
        )
        
        return contextual_fixes
    
    def learn_from_fix(self, code: str, fix_type: str, success: bool, context: CodeContext):
        """Learn from a fix attempt"""
        # Record in pattern classifier
        self.pattern_classifier.learn_pattern(code, fix_type, success)
        
        # Record in fix history
        self.fix_history.append({
            'code_hash': hashlib.md5(code.encode()).hexdigest()[:16],
            'fix_type': fix_type,
            'success': success,
            'context': context,
            'timestamp': str(Path().cwd())  # Simple timestamp substitute
        })
        
        # Update context patterns
        self._update_context_patterns(fix_type, success, context)
        
        # Save models periodically
        if len(self.fix_history) % 10 == 0:
            self._save_models()
    
    def _detect_framework(self, code: str) -> str:
        """Detect the framework used in the code"""
        if 'from \'react\'' in code or 'import React' in code:
            return 'react'
        elif '@testing-library' in code:
            return 'testing-library'
        elif 'jest.' in code or 'describe(' in code:
            return 'jest'
        elif 'interface ' in code or 'type ' in code:
            return 'typescript'
        else:
            return 'javascript'
    
    def _extract_patterns(self, code: str) -> List[str]:
        """Extract meaningful patterns from code"""
        patterns = []
        
        # Function call patterns
        patterns.extend(re.findall(r'(\w+)\s*\(', code))
        
        # Property access patterns
        patterns.extend(re.findall(r'\.(\w+)', code))
        
        # Testing patterns
        if 'expect(' in code:
            patterns.append('expect_assertion')
        if 'render(' in code:
            patterns.append('component_render')
        if 'waitFor(' in code:
            patterns.append('async_wait')
        if 'mock' in code.lower():
            patterns.append('mock_usage')
        
        return list(set(patterns))
    
    def _extract_imports(self, code: str) -> List[str]:
        """Extract import statements"""
        imports = []
        for line in code.split('\n'):
            if line.strip().startswith('import'):
                # Extract module name
                match = re.search(r'from\s+[\'"]([^\'"]+)[\'"]', line)
                if match:
                    imports.append(match.group(1))
        return imports
    
    def _extract_functions(self, code: str) -> List[str]:
        """Extract function names"""
        functions = []
        
        # Function declarations
        functions.extend(re.findall(r'function\s+(\w+)', code))
        
        # Arrow functions
        functions.extend(re.findall(r'const\s+(\w+)\s*=\s*\(.*?\)\s*=>', code))
        
        # Method calls
        functions.extend(re.findall(r'(\w+)\s*\(', code))
        
        return list(set(functions))
    
    def _extract_variables(self, code: str) -> List[str]:
        """Extract variable names"""
        variables = []
        
        # Variable declarations
        variables.extend(re.findall(r'(?:const|let|var)\s+(\w+)', code))
        
        return list(set(variables))
    
    def _classify_test_type(self, code: str, file_path: str) -> str:
        """Classify the type of test"""
        if 'render(' in code:
            return 'component'
        elif 'integration' in file_path.lower():
            return 'integration'
        elif any(pattern in code for pattern in ['describe(', 'it(', 'test(']):
            return 'unit'
        else:
            return 'unknown'
    
    def _calculate_complexity(self, code: str) -> float:
        """Calculate code complexity score"""
        lines = len([line for line in code.split('\n') if line.strip()])
        functions = len(re.findall(r'function|\(\s*\)\s*=>', code))
        conditions = len(re.findall(r'\b(if|else|switch|case|while|for)\b', code))
        
        # Simple complexity score
        return (lines * 0.1 + functions * 2 + conditions * 1.5) / 10
    
    def _calculate_context_match(self, fix: Dict, context: CodeContext) -> float:
        """Calculate how well a fix matches the current context"""
        match_score = 0.0
        
        # Framework match
        if fix.get('framework') == context.framework:
            match_score += 0.3
        
        # Test type match
        if fix.get('test_type') == context.test_type:
            match_score += 0.2
        
        # Pattern match
        fix_patterns = fix.get('patterns', [])
        pattern_overlap = len(set(fix_patterns) & set(context.patterns))
        if fix_patterns:
            match_score += 0.3 * (pattern_overlap / len(fix_patterns))
        
        # Import match
        fix_imports = fix.get('required_imports', [])
        import_overlap = len(set(fix_imports) & set(context.imports))
        if fix_imports:
            match_score += 0.2 * (import_overlap / len(fix_imports))
        
        return min(match_score, 1.0)
    
    def _get_ml_confidence(self, fix: Dict, context: CodeContext, code: str) -> float:
        """Get ML-based confidence for a fix"""
        # Use pattern classifier
        predicted_fix, base_confidence = self.pattern_classifier.predict_fix_type(code)
        
        # Adjust based on fix type match
        if predicted_fix == fix.get('fix_type'):
            confidence = base_confidence
        else:
            confidence = base_confidence * 0.7
        
        # Adjust based on context patterns
        fix_type = fix.get('fix_type', 'unknown')
        if fix_type in self.context_patterns:
            pattern_info = self.context_patterns[fix_type]
            context_boost = pattern_info.get('success_rate', 0.5) - 0.5
            confidence += context_boost * 0.3
        
        return max(0.1, min(confidence, 1.0))
    
    def _find_similar_patterns(self, code: str, fix_type: str) -> List[str]:
        """Find similar patterns from fix history"""
        similar = []
        
        for entry in self.fix_history[-50:]:  # Check recent history
            if entry['fix_type'] == fix_type and entry['success']:
                similar.append(entry['code_hash'])
        
        return similar[:5]  # Return top 5
    
    def _generate_reasoning(self, fix: Dict, context: CodeContext, similar_patterns: List[str]) -> str:
        """Generate human-readable reasoning for the fix"""
        reasons = []
        
        if context.framework:
            reasons.append(f"Detected {context.framework} framework")
        
        if context.test_type:
            reasons.append(f"Identified as {context.test_type} test")
        
        if similar_patterns:
            reasons.append(f"Found {len(similar_patterns)} similar successful patterns")
        
        if context.complexity_score > 5:
            reasons.append("High complexity code may benefit from this fix")
        
        return "; ".join(reasons) if reasons else "General fix recommendation"
    
    def _update_context_patterns(self, fix_type: str, success: bool, context: CodeContext):
        """Update context patterns based on fix results"""
        if fix_type not in self.context_patterns:
            self.context_patterns[fix_type] = {
                'total_attempts': 0,
                'successes': 0,
                'contexts': defaultdict(int)
            }
        
        pattern = self.context_patterns[fix_type]
        pattern['total_attempts'] += 1
        if success:
            pattern['successes'] += 1
        
        # Record context
        pattern['contexts'][context.framework] += 1
        pattern['contexts'][context.test_type] += 1
        
        # Update success rate
        pattern['success_rate'] = pattern['successes'] / pattern['total_attempts']
    
    def _save_models(self):
        """Save ML models to disk"""
        try:
            # Save pattern classifier
            with open(self.model_dir / 'pattern_classifier.pkl', 'wb') as f:
                pickle.dump(self.pattern_classifier, f)
            
            # Save context patterns
            with open(self.model_dir / 'context_patterns.json', 'w') as f:
                json.dump(self.context_patterns, f, indent=2)
            
            # Save fix history (recent only)
            with open(self.model_dir / 'fix_history.json', 'w') as f:
                json.dump(self.fix_history[-100:], f, indent=2, default=str)
            
            logger.info("ML models saved successfully")
        except Exception as e:
            logger.error(f"Error saving ML models: {e}")
    
    def _load_models(self):
        """Load ML models from disk"""
        try:
            # Load pattern classifier
            classifier_path = self.model_dir / 'pattern_classifier.pkl'
            if classifier_path.exists():
                with open(classifier_path, 'rb') as f:
                    self.pattern_classifier = pickle.load(f)
            
            # Load context patterns
            patterns_path = self.model_dir / 'context_patterns.json'
            if patterns_path.exists():
                with open(patterns_path, 'r') as f:
                    self.context_patterns = json.load(f)
            
            # Load fix history
            history_path = self.model_dir / 'fix_history.json'
            if history_path.exists():
                with open(history_path, 'r') as f:
                    self.fix_history = json.load(f)
            
            logger.info("ML models loaded successfully")
        except Exception as e:
            logger.error(f"Error loading ML models: {e}")

def main():
    """Test the ML context engine"""
    engine = MLContextEngine()
    
    # Test code
    test_code = '''
import React from 'react';
import { render, screen } from '@testing-library/react';

describe('Component Test', () => {
  it('should render correctly', () => {
    const mockData = { id: 1, name: 'test' };
    render(<Component data={mockData} />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
'''
    
    print("=== TESTING ML CONTEXT ENGINE ===")
    
    # Analyze context
    context = engine.analyze_context(test_code, 'test.tsx')
    print(f"Context Analysis:")
    print(f"  Framework: {context.framework}")
    print(f"  Test Type: {context.test_type}")
    print(f"  Patterns: {context.patterns}")
    print(f"  Complexity: {context.complexity_score:.2f}")
    
    # Mock available fixes
    available_fixes = [
        {
            'line': 1,
            'column': 1,
            'fix_type': 'import_fix',
            'old_text': 'import React',
            'new_text': 'import React from \'react\'',
            'description': 'Fix React import',
            'framework': 'react',
            'patterns': ['react']
        },
        {
            'line': 8,
            'column': 10,
            'fix_type': 'assertion_fix',
            'old_text': 'expect(screen.getByText(\'test\'))',
            'new_text': 'expect(screen.getByText(\'test\'))',
            'description': 'Fix assertion',
            'framework': 'testing-library',
            'patterns': ['expect_assertion']
        }
    ]
    
    # Get contextual suggestions
    suggestions = engine.suggest_contextual_fixes(test_code, 'test.tsx', available_fixes)
    
    print(f"\nContextual Fix Suggestions:")
    for i, suggestion in enumerate(suggestions, 1):
        print(f"  {i}. {suggestion.description}")
        print(f"     Confidence: {suggestion.confidence:.2f}")
        print(f"     Context Match: {suggestion.context_match:.2f}")
        print(f"     Reasoning: {suggestion.reasoning}")
    
    # Learn from a fix
    engine.learn_from_fix(test_code, 'import_fix', True, context)
    print(f"\nLearned from fix. Total history: {len(engine.fix_history)}")

if __name__ == "__main__":
    main()