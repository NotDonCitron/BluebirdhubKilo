#!/usr/bin/env python3
"""Apply automated fixes to test files."""

import sys
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
import json
import argparse
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from auto_fixer import fix_test_file, preview_fixes

class TestFixApplier:
    """Apply fixes to test files."""
    
    def __init__(self, dry_run: bool = False, backup: bool = True):
        self.dry_run = dry_run
        self.backup = backup
        self.fixes_applied = []
        self.errors = []
    
    def load_test_file(self, file_path: str) -> str:
        """Load test file content."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            self.errors.append(f"Error loading {file_path}: {e}")
            return ""
    
    def save_test_file(self, file_path: str, content: str):
        """Save fixed content to file."""
        if self.dry_run:
            print(f"[DRY RUN] Would save to: {file_path}")
            return
        
        try:
            # Create backup if requested
            if self.backup:
                backup_path = f"{file_path}.backup"
                with open(file_path, 'r', encoding='utf-8') as f:
                    backup_content = f.read()
                with open(backup_path, 'w', encoding='utf-8') as f:
                    f.write(backup_content)
                print(f"📁 Backup saved to: {backup_path}")
            
            # Save fixed content
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Fixed file saved: {file_path}")
        except Exception as e:
            self.errors.append(f"Error saving {file_path}: {e}")
    
    def fix_file(self, file_path: str, issues: Optional[List[str]] = None) -> Dict[str, Any]:
        """Fix a single test file."""
        print(f"\n🔧 Processing: {Path(file_path).name}")
        
        # Load file content
        content = self.load_test_file(file_path)
        if not content:
            return {"success": False, "error": "Could not load file"}
        
        # Apply fixes
        success, fixed_content, changes = fix_test_file(file_path, content, issues or [])
        
        if success:
            print(f"📝 Changes to apply:")
            for change in changes:
                print(f"   - {change}")
            
            if not self.dry_run:
                self.save_test_file(file_path, fixed_content)
                self.fixes_applied.append({
                    "file": file_path,
                    "changes": changes,
                    "timestamp": datetime.now().isoformat()
                })
            
            return {
                "success": True,
                "file": file_path,
                "changes": changes
            }
        else:
            print(f"ℹ️ No fixes needed for {Path(file_path).name}")
            return {
                "success": True,
                "file": file_path,
                "changes": []
            }
    
    def fix_multiple_files(self, file_paths: List[str]):
        """Fix multiple test files."""
        print(f"\n🚀 Processing {len(file_paths)} test files...")
        
        results = []
        for file_path in file_paths:
            result = self.fix_file(file_path)
            results.append(result)
        
        # Summary
        print("\n📊 Summary:")
        files_fixed = sum(1 for r in results if r.get("changes"))
        print(f"   Files processed: {len(file_paths)}")
        print(f"   Files fixed: {files_fixed}")
        print(f"   Total changes: {sum(len(r.get('changes', [])) for r in results)}")
        
        if self.errors:
            print(f"\n❌ Errors encountered:")
            for error in self.errors:
                print(f"   - {error}")
        
        # Save report
        report = {
            "timestamp": datetime.now().isoformat(),
            "dry_run": self.dry_run,
            "files_processed": len(file_paths),
            "files_fixed": files_fixed,
            "fixes_applied": self.fixes_applied,
            "errors": self.errors
        }
        
        report_path = "fix_report.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n📄 Report saved to: {report_path}")

def find_test_files(root_dir: str, patterns: Optional[List[str]] = None) -> List[str]:
    """Find all test files in the project."""
    if patterns is None:
        patterns = ['**/*.test.tsx', '**/*.test.ts', '**/*.test.jsx', '**/*.test.js']
    
    test_files = []
    root_path = Path(root_dir)
    
    for pattern in patterns:
        test_files.extend([str(f) for f in root_path.glob(pattern)])
    
    return test_files

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Apply automated fixes to test files')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without applying them')
    parser.add_argument('--no-backup', action='store_true', help='Skip creating backup files')
    parser.add_argument('--file', type=str, help='Fix a specific file')
    parser.add_argument('--dir', type=str, default='../app', help='Directory to search for test files')
    parser.add_argument('--pattern', type=str, help='Custom file pattern (e.g., "*.test.tsx")')
    parser.add_argument('--preview', action='store_true', help='Preview fixes for all files')
    
    args = parser.parse_args()
    
    if args.preview:
        # Preview mode
        print("🔍 Preview Mode - Analyzing test files...")
        test_files = find_test_files(args.dir)
        
        previews = []
        for file_path in test_files[:10]:  # Limit to first 10 files
            content = ""
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except:
                continue
            
            preview = preview_fixes(file_path, content)
            if preview["has_fixes"]:
                previews.append(preview)
                print(f"\n📄 {Path(file_path).name}")
                print(f"   Changes: {len(preview['changes'])}")
                for change in preview['changes']:
                    print(f"   - {change}")
        
        print(f"\n📊 Total files with fixes: {len(previews)}")
        return
    
    # Create fixer
    fixer = TestFixApplier(dry_run=args.dry_run, backup=not args.no_backup)
    
    if args.file:
        # Fix single file
        if not os.path.exists(args.file):
            print(f"❌ File not found: {args.file}")
            return
        
        fixer.fix_file(args.file)
    else:
        # Fix all test files
        test_files = find_test_files(args.dir)
        
        if not test_files:
            print(f"❌ No test files found in {args.dir}")
            return
        
        print(f"📂 Found {len(test_files)} test files")
        
        # Ask for confirmation
        if not args.dry_run:
            response = input("\n⚠️ This will modify test files. Continue? (y/N): ")
            if response.lower() != 'y':
                print("Cancelled.")
                return
        
        fixer.fix_multiple_files(test_files)

if __name__ == "__main__":
    main()