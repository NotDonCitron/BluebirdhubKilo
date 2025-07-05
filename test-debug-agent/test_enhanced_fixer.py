#!/usr/bin/env python3
"""
Test script for the enhanced auto-fixer with interface matching capabilities.
Demonstrates the improvements made based on lessons learned from fixing account-settings.test.tsx
"""

import json
from pathlib import Path
from auto_fixer import TestAutoFixer
from agent_tools import comprehensive_test_analysis, generate_enhanced_fix_suggestions

def create_sample_problematic_test():
    """Create a sample problematic test file for demonstration."""
    return """
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfile } from '@/components/dashboard/profile/user-profile';

// Mock with generic API response
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ message: 'success' })
  })
);

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'Test' } } })
}));

describe('UserProfile', () => {
  const mockUserData = {
    name: 'Test User',
    email: 'test@example.com',
    createdAt: 'invalid-date',
    settings: {
      notifications: true,
      theme: 'dark'
    }
  };

  it('renders user profile', async () => {
    render(<UserProfile userId="123" />);
    
    const loadingElement = screen.getByRole('loading');
    expect(loadingElement).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Save'));
    
    expect(screen.getByText('Profile saved')).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    render(<UserProfile userId="123" />);
    
    const input = screen.getByLabelText('Name');
    userEvent.type(input, 'New Name');
    
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);
    
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('displays creation date', () => {
    render(<UserProfile userId="123" />);
    
    const dateElement = screen.getByText(/Created:/);
    expect(dateElement).toBeInTheDocument();
  });
});
"""

def create_sample_component():
    """Create a sample component file for interface analysis."""
    return """
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  settings: UserSettings;
}

interface UserSettings {
  notifications: boolean;
  theme: 'light' | 'dark';
  language: string;
}

interface UserProfileProps {
  userId: string;
  onSave?: (data: UserInfo) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId, onSave }) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const [profileResponse, settingsResponse] = await Promise.all([
          fetch(`/api/users/${userId}/profile`),
          fetch(`/api/users/${userId}/settings`)
        ]);

        if (!profileResponse.ok || !settingsResponse.ok) {
          throw new Error('Failed to fetch user data');
        }

        const profileData = await profileResponse.json();
        const settingsData = await settingsResponse.json();

        setUserInfo({
          ...profileData,
          settings: settingsData
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  const handleSave = async (data: UserInfo) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to save user data');
      }

      onSave?.(data);
    } catch (err) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading user profile...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="user-profile">
      <h2>User Profile</h2>
      {userInfo && (
        <div>
          <p>Name: {userInfo.name}</p>
          <p>Email: {userInfo.email}</p>
          <p>Created: {format(new Date(userInfo.createdAt), 'MMM d, yyyy')}</p>
          <button onClick={() => handleSave(userInfo)}>Save</button>
        </div>
      )}
    </div>
  );
};
"""

def test_enhanced_auto_fixer():
    """Test the enhanced auto-fixer capabilities."""
    print("🧪 Testing Enhanced Auto-Fixer")
    print("=" * 50)
    
    # Create sample files
    test_content = create_sample_problematic_test()
    component_content = create_sample_component()
    
    # Mock source files for analysis
    source_files = {
        'app/components/dashboard/profile/user-profile.tsx': component_content
    }
    
    # Test file path
    test_file_path = 'app/__tests__/components/dashboard/profile/user-profile.test.tsx'
    
    print("📋 Sample Test File Issues:")
    print("- Generic API mock instead of endpoint-specific")
    print("- Invalid date format causing 'Invalid time value' error")
    print("- getByRole('loading') - should use CSS selector")
    print("- fireEvent not wrapped in act()")
    print("- userEvent not awaited")
    print("- Missing Promise.all handling for multiple API calls")
    print()
    
    # 1. Comprehensive Analysis
    print("🔍 Running Comprehensive Analysis...")
    analysis = comprehensive_test_analysis(test_file_path, test_content, source_files)
    
    print(f"📊 Analysis Results:")
    print(f"   Component File: {analysis['component_file']}")
    print(f"   Total Issues: {analysis['total_issues']}")
    print(f"   Severity: {analysis['severity']}")
    print(f"   Interface Mismatches: {len(analysis['interface_mismatches'])}")
    print(f"   Date Issues: {len(analysis['date_issues'])}")
    print(f"   Selector Issues: {len(analysis['selector_issues'])}")
    print(f"   Promise.all Issues: {len(analysis['promise_all_issues'])}")
    print(f"   Act Warnings: {len(analysis['act_warnings'].get('warnings', []))}")
    print()
    
    # 2. Generate Enhanced Fix Suggestions
    print("💡 Generating Enhanced Fix Suggestions...")
    suggestions = generate_enhanced_fix_suggestions(analysis)
    
    print(f"🎯 Fix Suggestions:")
    print(f"   Priority: {suggestions['priority']}")
    print(f"   Auto-fixable: {suggestions['auto_fixable']}")
    print(f"   Number of fixes: {len(suggestions['fixes'])}")
    print()
    
    # 3. Apply Enhanced Auto-Fixer
    print("🔧 Applying Enhanced Auto-Fixer...")
    fixer = TestAutoFixer()
    
    # Apply all fixes
    fix_result = fixer.apply_all_fixes(test_content, test_file_path)
    
    print(f"✅ Fix Results:")
    print(f"   Success: {fix_result.success}")
    print(f"   Changes Made: {len(fix_result.changes_made)}")
    print()
    
    if fix_result.success:
        print("📝 Changes Applied:")
        for i, change in enumerate(fix_result.changes_made, 1):
            print(f"   {i}. {change}")
        print()
        
        # Show a portion of the fixed content
        print("🔍 Sample of Fixed Content:")
        print("-" * 40)
        lines = fix_result.fixed_content.split('\n')
        for i, line in enumerate(lines[:30], 1):
            print(f"{i:2d} | {line}")
        print("... (truncated)")
        print("-" * 40)
        print()
    
    # 4. Component Interface Analysis
    print("🧩 Component Interface Analysis:")
    from agent_tools import analyze_component_interface
    
    component_interface = analyze_component_interface('app/components/dashboard/profile/user-profile.tsx')
    print(f"   Interfaces Found: {len(component_interface['interfaces'])}")
    for interface in component_interface['interfaces']:
        print(f"   - {interface['name']}")
    
    print(f"   API Endpoints: {len(component_interface['api_endpoints'])}")
    for endpoint in component_interface['api_endpoints']:
        print(f"   - {endpoint}")
    
    print(f"   Hooks Used: {len(component_interface['hooks'])}")
    for hook in component_interface['hooks']:
        print(f"   - {hook}")
    print()
    
    # 5. Show specific fix examples
    print("🔧 Specific Fix Examples:")
    print()
    
    # Show interface mismatch fixes
    if analysis['interface_mismatches']:
        print("📋 Interface Mismatch Fixes:")
        for mismatch in analysis['interface_mismatches']:
            print(f"   - {mismatch['description']}")
            print(f"     Recommendation: {mismatch['recommendation']}")
        print()
    
    # Show date formatting fixes
    if analysis['date_issues']:
        print("📅 Date Formatting Fixes:")
        for issue in analysis['date_issues']:
            print(f"   - {issue['description']}")
            print(f"     Recommendation: {issue['recommendation']}")
        print()
    
    # Show selector fixes
    if analysis['selector_issues']:
        print("🎯 Selector Fixes:")
        for issue in analysis['selector_issues']:
            print(f"   - {issue['description']}")
            print(f"     Recommendation: {issue['recommendation']}")
        print()
    
    print("🎉 Enhanced Auto-Fixer Test Complete!")
    print("=" * 50)
    print()
    print("✨ Key Improvements:")
    print("- Component interface analysis for better mock matching")
    print("- Comprehensive date formatting issue detection")
    print("- Smart selector pattern recognition")
    print("- Promise.all pattern handling")
    print("- React act() warning fixes")
    print("- Multi-layered issue detection and fixing")
    print()
    print("🚀 Ready to apply these improvements to real test files!")

if __name__ == "__main__":
    test_enhanced_auto_fixer()