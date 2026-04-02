import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState<'user' | 'driver'>('user');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(name, email, password, role);
      } else {
        await login(email, password);
      }

      // Redirect based on role stored after auth
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        navigate(u.role === 'driver' ? '/driver' : '/user');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-grab-green to-grab-dark flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-grab-green rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🛺</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">TukTuk</h1>
          <p className="text-gray-500 text-sm mt-1">Your ride, anytime</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              !isRegister ? 'bg-white text-grab-green shadow' : 'text-gray-500'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              isRegister ? 'bg-white text-grab-green shadow' : 'text-gray-500'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input-grab"
            />
          )}

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-grab"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="input-grab"
          />

          {isRegister && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  role === 'user'
                    ? 'border-grab-green bg-grab-light text-grab-green'
                    : 'border-gray-200 text-gray-500'
                }`}
              >
                🙋 Passenger
              </button>
              <button
                type="button"
                onClick={() => setRole('driver')}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  role === 'driver'
                    ? 'border-grab-green bg-grab-light text-grab-green'
                    : 'border-gray-200 text-gray-500'
                }`}
              >
                🛺 Driver
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-grab w-full"
          >
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
