import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { authAPI } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [showBgImage, setShowBgImage] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setShowBgImage(window.innerWidth >= 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    // Password length validation
    if (formData.password.length < 16) {
      setError('Password must be at least 16 characters long');
      setLoading(false);
      return;
    }

    try {
      // Call the backend login API
      const response = await authAPI.login(formData.email, formData.password);

      if (response.success) {
        // Store the JWT token and user info
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // Debug: Log user data to see structure
        console.log('Login response user data:', response.data.user);

        // Store agentId and phoneId from user's phone if available
        if (response.data.user.phone?.agentId) {
          console.log('Storing agentId:', response.data.user.phone.agentId);
          console.log('Storing phoneId:', response.data.user.phone._id);
          localStorage.setItem('agentId', response.data.user.phone.agentId);
          localStorage.setItem('phoneId', response.data.user.phone._id);
        } else {
          console.warn('No agentId found in user.phone. User data:', response.data.user);
          // Try to fetch user's phone/agent info separately if not in login response
          try {
            const userResponse = await authAPI.getCurrentUser();
            console.log('Current user data:', userResponse);
            if (userResponse.data?.user?.phone?.agentId) {
              localStorage.setItem('agentId', userResponse.data.user.phone.agentId);
              localStorage.setItem('phoneId', userResponse.data.user.phone._id);
              console.log('AgentId stored from /auth/me:', userResponse.data.user.phone.agentId);
              console.log('PhoneId stored from /auth/me:', userResponse.data.user.phone._id);
            }
          } catch (fetchErr) {
            console.error('Failed to fetch current user:', fetchErr);
          }
        }

        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);

      // Handle different error types
      if (err.response?.status === 401) {
        // Backend returns: { success: false, error: { code, message } }
        const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || 'Invalid email or password';
        setError(errorMessage);
      } else if (err.response?.data?.error?.message) {
        // Backend structured error format
        setError(err.response.data.error.message);
      } else if (err.response?.data?.message) {
        // Fallback for other error formats
        setError(err.response.data.message);
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError('Cannot connect to server. Please check if the backend is running.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center relative login-page overflow-hidden bg-[#6c2bd9]"
      style={{
        backgroundImage: showBgImage ? 'url(/images/bg.png)' : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#1f1b5d]/80 via-[#5b21b6]/70 to-[#7c3aed]/40" aria-hidden="true" />
      <div className="relative z-10 flex w-full items-center justify-start px-4 sm:px-8 lg:px-12 lg:pl-20">
        {/* Glass card only */}
        <div className="relative w-full max-w-md">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/55 via-white/10 to-transparent opacity-80 blur-2xl" aria-hidden="true" />
          <div className="relative bg-white/18 backdrop-blur-[30px] border border-white/40 rounded-xl shadow-[0_25px_80px_rgba(15,15,45,0.45)] w-full p-6 sm:p-8 lg:p-8 space-y-4 min-h-[500px] flex flex-col justify-center">
          {/* Logo */}
          <div className="text-center mb-6">
            {!logoError ? (
              <img 
                src="/images/brand-logo.png" 
                alt="Troika Tech Logo" 
                className="h-14 w-auto mx-auto"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div>
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                  Troika Tech
                </h1>
                <p className="text-gray-600 text-lg mt-2">
                  Your Digital Growth Partner
                </p>
              </div>
            )}
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-white">
                E-mail
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your e-mail"
                  className="pl-12 pr-4 py-3 rounded-lg border-gray-300 !bg-white !text-gray-900 dark:!bg-white dark:!text-gray-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-white">
                Password
              </label>
              <div className="relative">
                <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                  className="pl-12 pr-12 py-3 rounded-lg border-gray-300 !bg-white !text-gray-900 dark:!bg-white dark:!text-gray-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                </button>
              </div>
              <p className="text-xs text-white/80 mt-1">Password must be at least 16 characters</p>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-700 hover:bg-indigo-800 text-white py-3 rounded-lg font-semibold text-base shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </span>
              ) : (
                'Login'
              )}
            </Button>

          </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;