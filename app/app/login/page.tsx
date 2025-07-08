
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Eye, 
  EyeOff, 
  User, 
  Mail, 
  Lock,
  Zap,
  FileText,
  Users,
  Brain,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const { toast } = useToast();

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: loginForm.email,
        password: loginForm.password,
        callbackUrl: '/dashboard',
        redirect: false
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else if (result?.url) {
        toast({
          title: 'Welcome to AbacusHub!',
          description: 'AI-powered productivity at your fingertips.',
        });
        window.location.href = result.url;
        return;
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(signupForm)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Account created!',
          description: 'Welcome to the AI-powered workspace.',
        });
        
        const signInResult = await signIn('credentials', {
          email: signupForm.email,
          password: signupForm.password,
          callbackUrl: '/dashboard',
          redirect: false
        });

        if (signInResult?.url) {
          window.location.href = signInResult.url;
          return;
        }
      } else {
        setError(data.error || 'Failed to create account');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const demoResult = await signIn('credentials', {
        email: 'john@doe.com',
        password: 'johndoe123',
        callbackUrl: '/dashboard',
        redirect: false
      });

      if (demoResult?.url) {
        toast({
          title: 'Demo workspace ready!',
          description: 'Exploring AI-powered productivity features.',
        });
        window.location.href = demoResult.url;
        return;
      } else if (demoResult?.error) {
        setError('Demo login failed');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row min-h-screen">
        {/* Left Side - Hero Content */}
        <div className="lg:w-3/5 flex flex-col justify-center px-8 lg:px-16 xl:px-24 py-12">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            {/* Logo & Brand */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  AbacusHub
                </h1>
                <p className="text-sm text-gray-600">AI-Powered Workspace</p>
              </div>
            </div>

            {/* Main Headline - AppFlowy Style */}
            <h1 className="text-5xl lg:text-7xl font-medium text-gray-900 leading-tight mb-6" style={{ fontFamily: 'Poppins, Inter, sans-serif' }}>
              Bring projects, files, and teams together with{' '}
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                AI
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl lg:text-2xl text-gray-600 mb-8 leading-relaxed" style={{ fontFamily: 'Roboto, Helvetica, Arial, sans-serif' }}>
              The AI workspace where you achieve more without losing control of your data
            </p>

            {/* Key Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">AI-powered task management</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">Smart file organization</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">Real-time collaboration</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">Privacy-first approach</span>
              </div>
            </div>

            {/* CTA Buttons - AppFlowy Style */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button 
                onClick={handleDemoLogin}
                disabled={isLoading}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 text-base rounded-2xl shadow-lg"
                data-testid="demo-login-button"
              >
                {isLoading ? 'Starting...' : 'Start for free'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="px-8 py-4 text-base rounded-2xl border-2 hover:bg-gray-50"
                onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Create account
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>4 demo users</span>
              </div>
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Unlimited workspaces</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>AI-powered features</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="lg:w-2/5 flex items-center justify-center px-8 py-12" id="auth-section">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full max-w-md"
          >
            <Card className="bg-white/80 backdrop-blur-lg shadow-2xl border-0 rounded-3xl">
              <CardHeader className="text-center pb-6">
                <Badge variant="secondary" className="w-fit mx-auto mb-4 bg-purple-100 text-purple-700">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Get Started
                </Badge>
                <CardTitle className="text-2xl font-semibold">
                  {activeTab === 'login' ? 'Welcome back' : 'Create account'}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {activeTab === 'login' 
                    ? 'Sign in to your AI-powered workspace'
                    : 'Join thousands of productive teams'
                  }
                </CardDescription>
              </CardHeader>
              
              <CardContent className="px-8 pb-8">
                {/* Tab Buttons */}
                <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
                  <button
                    onClick={() => setActiveTab('login')}
                    className={`py-2 px-4 text-sm font-medium rounded-lg transition-all ${
                      activeTab === 'login'
                        ? 'bg-white text-purple-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setActiveTab('signup')}
                    className={`py-2 px-4 text-sm font-medium rounded-lg transition-all ${
                      activeTab === 'signup'
                        ? 'bg-white text-purple-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Login Form */}
                {activeTab === 'login' && (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">
                        Email address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@company.com"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                          className="pl-10 h-12 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                          data-testid="login-email-input"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                          className="pl-10 pr-10 h-12 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                          data-testid="login-password-input"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isLoading} 
                      className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl text-base font-medium"
                      data-testid="login-submit-button"
                    >
                      {isLoading ? 'Signing in...' : 'Sign in to workspace'}
                    </Button>
                  </form>
                )}

                {/* Signup Form */}
                {activeTab === 'signup' && (
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-medium text-gray-700">
                        Full name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Your full name"
                          value={signupForm.name}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, name: e.target.value }))}
                          className="pl-10 h-12 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium text-gray-700">
                        Email address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="you@company.com"
                          value={signupForm.email}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                          className="pl-10 h-12 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-medium text-gray-700">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a strong password"
                          value={signupForm.password}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                          className="pl-10 pr-10 h-12 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                          required
                          minLength={6}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isLoading} 
                      className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl text-base font-medium"
                    >
                      {isLoading ? 'Creating account...' : 'Start free workspace'}
                    </Button>
                  </form>
                )}

                <div className="text-center mt-6">
                  <Link href="/" className="text-sm text-gray-500 hover:text-purple-600 transition-colors">
                    ← Back to homepage
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
