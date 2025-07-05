#!/usr/bin/env python3
"""
TypeScript Analyzer Module for Next-Generation Auto-Fixer
Phase 2: TypeScript Compiler Integration

This module provides deep TypeScript integration for advanced type checking,
inference, and interface analysis using the TypeScript compiler API.
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
class TypeDiagnostic:
    """TypeScript diagnostic information"""
    line: int
    column: int
    message: str
    severity: str  # 'error', 'warning', 'info', 'suggestion'
    code: int
    category: str
    file: str

@dataclass
class TypeDefinition:
    """Type definition information"""
    name: str
    type_string: str
    kind: str  # 'interface', 'type', 'class', 'enum', 'function', 'variable'
    location: Dict[str, Any]
    properties: List[Dict[str, Any]]

@dataclass
class ImportInfo:
    """Import statement information"""
    module: str
    imports: List[str]
    default_import: Optional[str]
    namespace_import: Optional[str]
    is_type_only: bool

@dataclass
class TypeAnalysis:
    """Results of TypeScript analysis"""
    is_valid: bool
    diagnostics: List[TypeDiagnostic]
    type_definitions: List[TypeDefinition]
    imports: List[ImportInfo]
    inferred_types: Dict[str, str]
    analysis_time: float
    project_config: Dict[str, Any]

class TypeScriptService:
    """TypeScript Language Service integration"""
    
    def __init__(self, project_root: str = None):
        self.project_root = project_root or os.getcwd()
        self.ts_service_script = None
        self.tsconfig_path = None
        self._setup_typescript_service()
    
    def _setup_typescript_service(self):
        """Setup TypeScript language service"""
        # Create TypeScript service script
        ts_service_content = '''
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

class TypeScriptAnalyzer {
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
        this.program = null;
        this.typeChecker = null;
        this.setupProgram();
    }
    
    setupProgram() {
        // Find tsconfig.json
        const configPath = ts.findConfigFile(this.projectRoot, ts.sys.fileExists, 'tsconfig.json');
        let compilerOptions = {};
        let rootNames = [];
        
        if (configPath) {
            const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
            const parsedConfig = ts.parseJsonConfigFileContent(
                configFile.config,
                ts.sys,
                path.dirname(configPath)
            );
            compilerOptions = parsedConfig.options;
            rootNames = parsedConfig.fileNames;
        } else {
            // Default compiler options
            compilerOptions = {
                target: ts.ScriptTarget.ES2020,
                module: ts.ModuleKind.CommonJS,
                lib: ['es2020', 'dom'],
                declaration: true,
                outDir: './dist',
                rootDir: './src',
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                forceConsistentCasingInFileNames: true,
                resolveJsonModule: true,
                jsx: ts.JsxEmit.React,
                allowJs: true,
                checkJs: false
            };
        }
        
        this.program = ts.createProgram(rootNames, compilerOptions);
        this.typeChecker = this.program.getTypeChecker();
    }
    
    analyzeFile(filePath) {
        try {
            const sourceFile = this.program.getSourceFile(filePath);
            if (!sourceFile) {
                // Create source file if not in program
                const content = fs.readFileSync(filePath, 'utf8');
                const createdSourceFile = ts.createSourceFile(
                    filePath,
                    content,
                    ts.ScriptTarget.Latest,
                    true,
                    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
                );
                
                return this.analyzeSourceFile(createdSourceFile, content);
            }
            
            return this.analyzeSourceFile(sourceFile);
        } catch (error) {
            return {
                success: false,
                error: error.message,
                diagnostics: [],
                typeDefinitions: [],
                imports: [],
                inferredTypes: {}
            };
        }
    }
    
    analyzeSourceFile(sourceFile, content = null) {
        const diagnostics = [];
        const typeDefinitions = [];
        const imports = [];
        const inferredTypes = {};
        
        // Get diagnostics
        const syntacticDiagnostics = this.program.getSyntacticDiagnostics(sourceFile);
        const semanticDiagnostics = this.program.getSemanticDiagnostics(sourceFile);
        
        [...syntacticDiagnostics, ...semanticDiagnostics].forEach(diagnostic => {
            if (diagnostic.file && diagnostic.start !== undefined) {
                const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
                diagnostics.push({
                    line: line + 1,
                    column: character + 1,
                    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\\n'),
                    severity: this.getDiagnosticSeverity(diagnostic.category),
                    code: diagnostic.code,
                    category: ts.DiagnosticCategory[diagnostic.category],
                    file: diagnostic.file.fileName
                });
            }
        });
        
        // Analyze AST
        const visitNode = (node) => {
            // Extract imports
            if (ts.isImportDeclaration(node)) {
                const importInfo = this.extractImportInfo(node);
                if (importInfo) imports.push(importInfo);
            }
            
            // Extract type definitions
            if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
                const typeDef = this.extractTypeDefinition(node);
                if (typeDef) typeDefinitions.push(typeDef);
            }
            
            // Extract variable types
            if (ts.isVariableDeclaration(node) && node.name) {
                const symbol = this.typeChecker.getSymbolAtLocation(node.name);
                if (symbol) {
                    const type = this.typeChecker.getTypeOfSymbolAtLocation(symbol, node);
                    const typeString = this.typeChecker.typeToString(type);
                    inferredTypes[symbol.name] = typeString;
                }
            }
            
            // Extract function types
            if (ts.isFunctionDeclaration(node) && node.name) {
                const symbol = this.typeChecker.getSymbolAtLocation(node.name);
                if (symbol) {
                    const type = this.typeChecker.getTypeOfSymbolAtLocation(symbol, node);
                    const typeString = this.typeChecker.typeToString(type);
                    inferredTypes[symbol.name] = typeString;
                }
            }
            
            ts.forEachChild(node, visitNode);
        };
        
        visitNode(sourceFile);
        
        return {
            success: true,
            isValid: diagnostics.length === 0,
            diagnostics,
            typeDefinitions,
            imports,
            inferredTypes,
            projectConfig: this.program.getCompilerOptions()
        };
    }
    
    extractImportInfo(node) {
        if (!node.moduleSpecifier) return null;
        
        const moduleSpecifier = node.moduleSpecifier.text;
        const imports = [];
        let defaultImport = null;
        let namespaceImport = null;
        let isTypeOnly = false;
        
        if (node.importClause) {
            isTypeOnly = node.importClause.isTypeOnly || false;
            
            // Default import
            if (node.importClause.name) {
                defaultImport = node.importClause.name.text;
            }
            
            // Named imports
            if (node.importClause.namedBindings) {
                if (ts.isNamedImports(node.importClause.namedBindings)) {
                    node.importClause.namedBindings.elements.forEach(element => {
                        imports.push(element.name.text);
                    });
                } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                    namespaceImport = node.importClause.namedBindings.name.text;
                }
            }
        }
        
        return {
            module: moduleSpecifier,
            imports,
            defaultImport,
            namespaceImport,
            isTypeOnly
        };
    }
    
    extractTypeDefinition(node) {
        const name = node.name ? node.name.text : null;
        if (!name) return null;
        
        const kind = ts.isInterfaceDeclaration(node) ? 'interface' : 'type';
        const location = {
            line: node.getSourceFile().getLineAndCharacterOfPosition(node.pos).line + 1,
            column: node.getSourceFile().getLineAndCharacterOfPosition(node.pos).character + 1
        };
        
        const properties = [];
        
        if (ts.isInterfaceDeclaration(node) && node.members) {
            node.members.forEach(member => {
                if (ts.isPropertySignature(member) && member.name) {
                    const propName = member.name.getText();
                    const propType = member.type ? member.type.getText() : 'any';
                    properties.push({
                        name: propName,
                        type: propType,
                        optional: !!member.questionToken
                    });
                }
            });
        }
        
        return {
            name,
            typeString: node.getText(),
            kind,
            location,
            properties
        };
    }
    
    getDiagnosticSeverity(category) {
        switch (category) {
            case ts.DiagnosticCategory.Error: return 'error';
            case ts.DiagnosticCategory.Warning: return 'warning';
            case ts.DiagnosticCategory.Message: return 'info';
            case ts.DiagnosticCategory.Suggestion: return 'suggestion';
            default: return 'info';
        }
    }
    
    generateTypeAnnotations(filePath, variableName) {
        try {
            const sourceFile = this.program.getSourceFile(filePath);
            if (!sourceFile) return null;
            
            // Find variable declaration
            const findVariable = (node) => {
                if (ts.isVariableDeclaration(node) && 
                    node.name && 
                    node.name.getText() === variableName) {
                    
                    const symbol = this.typeChecker.getSymbolAtLocation(node.name);
                    if (symbol) {
                        const type = this.typeChecker.getTypeOfSymbolAtLocation(symbol, node);
                        return this.typeChecker.typeToString(type);
                    }
                }
                
                let result = null;
                ts.forEachChild(node, (child) => {
                    if (!result) {
                        result = findVariable(child);
                    }
                });
                return result;
            };
            
            return findVariable(sourceFile);
        } catch (error) {
            return null;
        }
    }
}

// Main execution
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node typescript-analyzer.js <project-root> <file-path>');
    process.exit(1);
}

const projectRoot = args[0];
const filePath = args[1];

const analyzer = new TypeScriptAnalyzer(projectRoot);
const result = analyzer.analyzeFile(filePath);

console.log(JSON.stringify(result, null, 2));
'''
        
        # Create temporary TypeScript service script
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(ts_service_content)
            self.ts_service_script = f.name
        
        # Find tsconfig.json
        self.tsconfig_path = self._find_tsconfig()
    
    def _find_tsconfig(self) -> Optional[str]:
        """Find tsconfig.json in project"""
        current_dir = Path(self.project_root)
        while current_dir != current_dir.parent:
            tsconfig_path = current_dir / 'tsconfig.json'
            if tsconfig_path.exists():
                return str(tsconfig_path)
            current_dir = current_dir.parent
        return None
    
    def analyze_file(self, file_path: str) -> Dict[str, Any]:
        """Analyze TypeScript file"""
        try:
            # Ensure TypeScript is available
            self._ensure_typescript_available()
            
            if not self.ts_service_script:
                raise RuntimeError("TypeScript service script not initialized")
            
            # Run TypeScript analysis
            result = subprocess.run([
                'node', self.ts_service_script, self.project_root, file_path
            ], capture_output=True, text=True, timeout=60)
            
            if result.returncode != 0:
                logger.error(f"TypeScript analysis failed: {result.stderr}")
                return {
                    'success': False,
                    'error': result.stderr,
                    'diagnostics': [],
                    'typeDefinitions': [],
                    'imports': [],
                    'inferredTypes': {}
                }
            
            return json.loads(result.stdout)
            
        except subprocess.TimeoutExpired:
            logger.error(f"Timeout analyzing TypeScript file: {file_path}")
            return {
                'success': False,
                'error': 'Analysis timeout',
                'diagnostics': [],
                'typeDefinitions': [],
                'imports': [],
                'inferredTypes': {}
            }
        except Exception as e:
            logger.error(f"Error analyzing TypeScript file {file_path}: {e}")
            return {
                'success': False,
                'error': str(e),
                'diagnostics': [],
                'typeDefinitions': [],
                'imports': [],
                'inferredTypes': {}
            }
    
    def _ensure_typescript_available(self):
        """Ensure TypeScript is available"""
        try:
            result = subprocess.run(['node', '-e', 'require("typescript")'], 
                                  capture_output=True, text=True)
            if result.returncode != 0:
                logger.info("Installing TypeScript...")
                subprocess.run(['npm', 'install', 'typescript'], check=True)
        except subprocess.CalledProcessError:
            logger.warning("Could not verify/install TypeScript")
    
    def __del__(self):
        """Cleanup"""
        if self.ts_service_script and os.path.exists(self.ts_service_script):
            os.unlink(self.ts_service_script)

class TypeScriptAnalyzer:
    """Main TypeScript analyzer"""
    
    def __init__(self, project_root: str = None):
        self.project_root = project_root or os.getcwd()
        self.ts_service = TypeScriptService(project_root)
        self.supported_extensions = {'.ts', '.tsx', '.js', '.jsx'}
    
    def analyze_file(self, file_path: str) -> TypeAnalysis:
        """Analyze TypeScript file"""
        import time
        start_time = time.time()
        
        file_path_obj = Path(file_path)
        
        # Check if file is supported
        if file_path_obj.suffix not in self.supported_extensions:
            return TypeAnalysis(
                is_valid=False,
                diagnostics=[TypeDiagnostic(
                    line=1, column=1,
                    message=f"Unsupported file type: {file_path_obj.suffix}",
                    severity='error', code=0, category='Error', file=file_path
                )],
                type_definitions=[],
                imports=[],
                inferred_types={},
                analysis_time=time.time() - start_time,
                project_config={}
            )
        
        # Analyze with TypeScript service
        result = self.ts_service.analyze_file(file_path)
        analysis_time = time.time() - start_time
        
        if not result['success']:
            return TypeAnalysis(
                is_valid=False,
                diagnostics=[TypeDiagnostic(
                    line=1, column=1,
                    message=result.get('error', 'Unknown TypeScript error'),
                    severity='error', code=0, category='Error', file=file_path
                )],
                type_definitions=[],
                imports=[],
                inferred_types={},
                analysis_time=analysis_time,
                project_config={}
            )
        
        # Convert to our data structures
        diagnostics = [
            TypeDiagnostic(**diag) for diag in result.get('diagnostics', [])
        ]
        
        type_definitions = [
            TypeDefinition(**typedef) for typedef in result.get('typeDefinitions', [])
        ]
        
        imports = [
            ImportInfo(**imp) for imp in result.get('imports', [])
        ]
        
        return TypeAnalysis(
            is_valid=result.get('isValid', True),
            diagnostics=diagnostics,
            type_definitions=type_definitions,
            imports=imports,
            inferred_types=result.get('inferredTypes', {}),
            analysis_time=analysis_time,
            project_config=result.get('projectConfig', {})
        )
    
    def get_type_suggestions(self, file_path: str, variable_name: str) -> Optional[str]:
        """Get type suggestions for a variable"""
        try:
            # This would use the TypeScript service to get type information
            # For now, return basic type inference
            result = self.ts_service.analyze_file(file_path)
            if result['success']:
                return result.get('inferredTypes', {}).get(variable_name)
            return None
        except Exception as e:
            logger.error(f"Error getting type suggestions: {e}")
            return None
    
    def suggest_interface_from_usage(self, content: str, variable_name: str) -> Optional[str]:
        """Suggest interface definition from variable usage"""
        # Simple heuristic-based interface suggestion
        lines = content.split('\n')
        properties = set()
        
        for line in lines:
            # Look for property access patterns
            if f'{variable_name}.' in line:
                # Extract property name
                parts = line.split(f'{variable_name}.')
                if len(parts) > 1:
                    prop_part = parts[1].split()[0]  # Get first word after dot
                    prop_name = prop_part.split('(')[0].split('[')[0]  # Remove method calls/array access
                    if prop_name and prop_name.isidentifier():
                        properties.add(prop_name)
        
        if properties:
            interface_name = f"{variable_name.capitalize()}Interface"
            props = ['  ' + prop + ': any;' for prop in sorted(properties)]
            return f"interface {interface_name} {{\\n{'\\n'.join(props)}\\n}}"
        
        return None
    
    def analyze_mock_data_compatibility(self, file_path: str, mock_variable: str) -> Dict[str, Any]:
        """Analyze mock data compatibility with expected types"""
        analysis = self.analyze_file(file_path)
        
        compatibility_issues = []
        suggestions = []
        
        # Look for type mismatches in mock data
        for diagnostic in analysis.diagnostics:
            if mock_variable in diagnostic.message:
                compatibility_issues.append({
                    'line': diagnostic.line,
                    'message': diagnostic.message,
                    'severity': diagnostic.severity
                })
        
        # Suggest better types based on usage
        type_suggestion = self.get_type_suggestions(file_path, mock_variable)
        if type_suggestion:
            suggestions.append(f"Consider typing {mock_variable} as: {type_suggestion}")
        
        return {
            'compatibility_issues': compatibility_issues,
            'suggestions': suggestions,
            'inferred_types': analysis.inferred_types
        }

def main():
    """Test TypeScript analyzer"""
    analyzer = TypeScriptAnalyzer()
    
    # Test file
    test_file = "../app/__tests__/basic-notification-settings.test.tsx"
    if os.path.exists(test_file):
        print(f"Analyzing TypeScript file: {test_file}")
        analysis = analyzer.analyze_file(test_file)
        
        print(f"Is valid: {analysis.is_valid}")
        print(f"Analysis time: {analysis.analysis_time:.3f}s")
        print(f"Diagnostics: {len(analysis.diagnostics)}")
        print(f"Type definitions: {len(analysis.type_definitions)}")
        print(f"Imports: {len(analysis.imports)}")
        print(f"Inferred types: {len(analysis.inferred_types)}")
        
        if analysis.diagnostics:
            print("\nDiagnostics:")
            for diag in analysis.diagnostics[:5]:  # Show first 5
                print(f"  Line {diag.line}:{diag.column} - {diag.message}")
        
        if analysis.imports:
            print("\nImports:")
            for imp in analysis.imports:
                print(f"  From '{imp.module}': {imp.imports}")
        
        if analysis.inferred_types:
            print("\nInferred types:")
            for name, type_str in list(analysis.inferred_types.items())[:5]:
                print(f"  {name}: {type_str}")
    else:
        print(f"Test file not found: {test_file}")

if __name__ == "__main__":
    main()