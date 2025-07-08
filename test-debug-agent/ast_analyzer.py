#!/usr/bin/env python3
"""
AST Analyzer Module for Next-Generation Auto-Fixer
Phase 1: AST Integration

This module provides Abstract Syntax Tree parsing capabilities for JavaScript/TypeScript
files to detect and analyze complex syntax errors that pattern-based approaches cannot handle.
"""

import json
import subprocess
import tempfile
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class SyntaxError:
    """Represents a syntax error found in code"""
    line: int
    column: int
    message: str
    severity: str  # 'error', 'warning', 'info'
    error_code: str
    source: str  # 'ast', 'typescript', 'eslint'

@dataclass
class ASTNode:
    """Represents a node in the Abstract Syntax Tree"""
    type: str
    start: int
    end: int
    line: int
    column: int
    raw: str
    children: List['ASTNode']

@dataclass
class ASTAnalysis:
    """Results of AST analysis"""
    is_valid: bool
    syntax_errors: List[SyntaxError]
    ast_nodes: List[ASTNode]
    parse_time: float
    file_type: str  # 'typescript', 'javascript', 'tsx', 'jsx'

class JSASTParser:
    """JavaScript/TypeScript AST parser using Node.js"""
    
    def __init__(self):
        self.node_script_path = None
        self._setup_node_script()
    
    def _setup_node_script(self):
        """Setup Node.js script for AST parsing"""
        node_script_content = '''
const ts = require('typescript');
const fs = require('fs');

function parseFile(filePath, allowErrors = false) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const sourceFile = ts.createSourceFile(
            filePath,
            content,
            ts.ScriptTarget.Latest,
            true,
            filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
        );
        
        const errors = [];
        const nodes = [];
        
        // Collect syntax errors
        const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([filePath], {}));
        diagnostics.forEach(diagnostic => {
            if (diagnostic.file && diagnostic.start !== undefined) {
                const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
                errors.push({
                    line: line + 1,
                    column: character + 1,
                    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\\n'),
                    severity: 'error',
                    errorCode: diagnostic.code.toString(),
                    source: 'typescript'
                });
            }
        });
        
        // Traverse AST and collect nodes
        function visitNode(node) {
            if (node.pos !== undefined && node.end !== undefined) {
                const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.pos);
                nodes.push({
                    type: ts.SyntaxKind[node.kind],
                    start: node.pos,
                    end: node.end,
                    line: line + 1,
                    column: character + 1,
                    raw: content.substring(node.pos, node.end),
                    children: []
                });
            }
            ts.forEachChild(node, visitNode);
        }
        
        visitNode(sourceFile);
        
        return {
            success: true,
            isValid: errors.length === 0,
            syntaxErrors: errors,
            astNodes: nodes,
            fileType: filePath.endsWith('.tsx') ? 'tsx' : 
                     filePath.endsWith('.jsx') ? 'jsx' :
                     filePath.endsWith('.ts') ? 'typescript' : 'javascript'
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message,
            isValid: false,
            syntaxErrors: [{
                line: 1,
                column: 1,
                message: error.message,
                severity: 'error',
                errorCode: 'PARSE_ERROR',
                source: 'ast'
            }],
            astNodes: [],
            fileType: 'unknown'
        };
    }
}

// Main execution
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error('Usage: node script.js <file-path> [allow-errors]');
    process.exit(1);
}

const filePath = args[0];
const allowErrors = args[1] === 'true';

const result = parseFile(filePath, allowErrors);
console.log(JSON.stringify(result, null, 2));
'''
        
        # Create temporary Node.js script
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(node_script_content)
            self.node_script_path = f.name
    
    def parse(self, file_path: str, allow_errors: bool = False) -> Dict[str, Any]:
        """Parse JavaScript/TypeScript file using Node.js"""
        try:
            # Ensure TypeScript is installed
            self._ensure_typescript_installed()
            
            # Check if node script is available
            if not self.node_script_path:
                raise RuntimeError("Node.js script not initialized")
            
            # Set up environment to find global node modules
            env = os.environ.copy()
            
            # Get global node_modules path
            try:
                global_modules_result = subprocess.run(['npm', 'root', '-g'],
                                                     capture_output=True, text=True)
                if global_modules_result.returncode == 0:
                    global_modules_path = global_modules_result.stdout.strip()
                    current_node_path = env.get('NODE_PATH', '')
                    if current_node_path:
                        env['NODE_PATH'] = f"{global_modules_path}{os.pathsep}{current_node_path}"
                    else:
                        env['NODE_PATH'] = global_modules_path
            except Exception as e:
                logger.warning(f"Could not determine global node_modules path: {e}")
            
            # Run Node.js script
            result = subprocess.run([
                'node', self.node_script_path, file_path, str(allow_errors).lower()
            ], capture_output=True, text=True, timeout=30, env=env)
            
            if result.returncode != 0:
                logger.error(f"Node.js parsing failed: {result.stderr}")
                return {
                    'success': False,
                    'error': result.stderr,
                    'isValid': False,
                    'syntaxErrors': [],
                    'astNodes': [],
                    'fileType': 'unknown'
                }
            
            return json.loads(result.stdout)
            
        except subprocess.TimeoutExpired:
            logger.error(f"Timeout parsing file: {file_path}")
            return {
                'success': False,
                'error': 'Parse timeout',
                'isValid': False,
                'syntaxErrors': [],
                'astNodes': [],
                'fileType': 'unknown'
            }
        except Exception as e:
            logger.error(f"Error parsing file {file_path}: {e}")
            return {
                'success': False,
                'error': str(e),
                'isValid': False,
                'syntaxErrors': [],
                'astNodes': [],
                'fileType': 'unknown'
            }
    
    def _ensure_typescript_installed(self):
        """Ensure TypeScript is installed globally"""
        try:
            result = subprocess.run(['npm', 'list', '-g', 'typescript'], 
                                  capture_output=True, text=True)
            if 'typescript@' not in result.stdout:
                logger.info("Installing TypeScript globally...")
                subprocess.run(['npm', 'install', '-g', 'typescript'], check=True)
        except subprocess.CalledProcessError:
            logger.warning("Could not verify/install TypeScript. AST parsing may fail.")
    
    def __del__(self):
        """Cleanup temporary files"""
        if self.node_script_path and os.path.exists(self.node_script_path):
            os.unlink(self.node_script_path)

class ASTAnalyzer:
    """Main AST analyzer for detecting and analyzing syntax errors"""
    
    def __init__(self):
        self.js_parser = JSASTParser()
        self.supported_extensions = {'.ts', '.tsx', '.js', '.jsx', '.test.ts', '.test.tsx'}
    
    def analyze_file(self, file_path: str) -> ASTAnalysis:
        """Analyze a file and return AST analysis results"""
        import time
        start_time = time.time()
        
        file_path_obj = Path(file_path)
        
        # Check if file type is supported
        if not any(file_path.endswith(ext) for ext in self.supported_extensions):
            return ASTAnalysis(
                is_valid=False,
                syntax_errors=[SyntaxError(
                    line=1, column=1,
                    message=f"Unsupported file type: {file_path_obj.suffix}",
                    severity='error', error_code='UNSUPPORTED_TYPE', source='ast'
                )],
                ast_nodes=[],
                parse_time=time.time() - start_time,
                file_type='unsupported'
            )
        
        # Parse with Node.js
        parse_result = self.js_parser.parse(file_path)
        parse_time = time.time() - start_time
        
        if not parse_result['success']:
            return ASTAnalysis(
                is_valid=False,
                syntax_errors=[SyntaxError(
                    line=1, column=1,
                    message=parse_result.get('error', 'Unknown parse error'),
                    severity='error', error_code='PARSE_FAILED', source='ast'
                )],
                ast_nodes=[],
                parse_time=parse_time,
                file_type=parse_result.get('fileType', 'unknown')
            )
        
        # Convert to our data structures
        syntax_errors = []
        for error in parse_result['syntaxErrors']:
            # Map Node.js field names to Python field names
            mapped_error = {
                'line': error['line'],
                'column': error['column'],
                'message': error['message'],
                'severity': error['severity'],
                'error_code': error.get('errorCode', 'UNKNOWN'),  # Map errorCode to error_code
                'source': error['source']
            }
            syntax_errors.append(SyntaxError(**mapped_error))
        
        ast_nodes = [
            ASTNode(
                type=node['type'],
                start=node['start'],
                end=node['end'],
                line=node['line'],
                column=node['column'],
                raw=node['raw'],
                children=[]  # Simplified for now
            ) for node in parse_result['astNodes']
        ]
        
        return ASTAnalysis(
            is_valid=parse_result['isValid'],
            syntax_errors=syntax_errors,
            ast_nodes=ast_nodes,
            parse_time=parse_time,
            file_type=parse_result['fileType']
        )
    
    def detect_specific_errors(self, analysis: ASTAnalysis, content: str) -> List[SyntaxError]:
        """Detect specific syntax error patterns in the AST"""
        specific_errors = []
        lines = content.split('\n')
        
        # Check for common test file syntax errors
        for i, line in enumerate(lines):
            line_num = i + 1
            
            # Detect unmatched parentheses in function calls
            if any(pattern in line for pattern in ['expect(', 'render(', 'waitFor(', 'screen.getBy']):
                open_parens = line.count('(')
                close_parens = line.count(')')
                if open_parens > close_parens:
                    specific_errors.append(SyntaxError(
                        line=line_num,
                        column=len(line) - len(line.lstrip()) + 1,
                        message=f"Unmatched opening parenthesis in function call",
                        severity='error',
                        error_code='UNMATCHED_PAREN',
                        source='ast'
                    ))
                elif close_parens > open_parens:
                    specific_errors.append(SyntaxError(
                        line=line_num,
                        column=line.rfind(')') + 1,
                        message=f"Unmatched closing parenthesis in function call",
                        severity='error',
                        error_code='UNMATCHED_PAREN',
                        source='ast'
                    ))
            
            # Detect malformed function calls
            if 'setSystemTime(' in line and not line.strip().endswith(');'):
                if ';' in line and ')' not in line[line.index(';'):]:
                    specific_errors.append(SyntaxError(
                        line=line_num,
                        column=line.index('setSystemTime') + 1,
                        message="Incomplete setSystemTime call - missing closing parenthesis",
                        severity='error',
                        error_code='INCOMPLETE_CALL',
                        source='ast'
                    ))
            
            # Detect malformed async patterns
            if 'setTimeout(()' in line and ';' in line and ')' not in line[line.index(';'):]:
                specific_errors.append(SyntaxError(
                    line=line_num,
                    column=line.index('setTimeout') + 1,
                    message="Malformed setTimeout pattern",
                    severity='error',
                    error_code='MALFORMED_TIMEOUT',
                    source='ast'
                ))
        
        return specific_errors
    
    def analyze_with_content(self, file_path: str, content: str) -> ASTAnalysis:
        """Analyze file with content for additional error detection"""
        # Create temporary file for analysis
        file_path_obj = Path(file_path)
        with tempfile.NamedTemporaryFile(mode='w', suffix=file_path_obj.suffix, delete=False) as f:
            f.write(content)
            temp_path = f.name
        
        try:
            analysis = self.analyze_file(temp_path)
            
            # Add specific error detection
            specific_errors = self.detect_specific_errors(analysis, content)
            analysis.syntax_errors.extend(specific_errors)
            
            return analysis
        finally:
            os.unlink(temp_path)

def main():
    """Test the AST analyzer"""
    analyzer = ASTAnalyzer()
    
    # Test with a sample file
    test_file = "../app/__tests__/basic-notification-settings.test.tsx"
    if os.path.exists(test_file):
        print(f"Analyzing {test_file}...")
        analysis = analyzer.analyze_file(test_file)
        
        print(f"File type: {analysis.file_type}")
        print(f"Is valid: {analysis.is_valid}")
        print(f"Parse time: {analysis.parse_time:.3f}s")
        print(f"Syntax errors: {len(analysis.syntax_errors)}")
        print(f"AST nodes: {len(analysis.ast_nodes)}")
        
        if analysis.syntax_errors:
            print("\nSyntax Errors:")
            for error in analysis.syntax_errors:
                print(f"  Line {error.line}:{error.column} - {error.message} ({error.error_code})")
    else:
        print(f"Test file not found: {test_file}")

if __name__ == "__main__":
    main()