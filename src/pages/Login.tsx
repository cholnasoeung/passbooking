import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import vehiclesService from '../services/vehicles';
import type { VehicleOption } from '../services/vehicles';

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
  const [availableVehicles, setAvailableVehicles] = useState<VehicleOption[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [vehicleError, setVehicleError] = useState('');

  useEffect(() => {
    void vehiclesService.getVehicles()
      .then((vehicles) => setAvailableVehicles(vehicles))
      .catch(() => setVehicleError('Unable to load vehicles'));
  }, []);

  useEffect(() => {
    if (role === 'user') {
      setSelectedVehicleId('');
      setVehicleError('');
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (role === 'driver' && !selectedVehicleId) {
          setVehicleError('Please choose a vehicle');
          return;
        }
        await register(name, email, password, role, role === 'driver' ? selectedVehicleId : undefined);
      } else {
        await login(email, password);
      }

      // Redirect based on role stored after auth
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored) as { role: 'user' | 'driver' | 'admin' };
        navigate(u.role === 'admin' ? '/admin' : u.role === 'driver' ? '/driver' : '/user');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
      setVehicleError('');
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

          {isRegister && role === 'driver' && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Vehicle type</p>
              <select
                value={selectedVehicleId}
                onChange={(event) => setSelectedVehicleId(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="" disabled>
                  Select your vehicle
                </option>
                {availableVehicles.map((vehicle) => (
                  <option key={vehicle._id} value={vehicle._id}>
                    {vehicle.type.charAt(0).toUpperCase() + vehicle.type.slice(1)} • ${vehicle.basePrice.toFixed(2)} + ${vehicle.pricePerKm.toFixed(2)}/km • {vehicle.maxSeats} seats
                  </option>
                ))}
              </select>
              {vehicleError && (
                <p className="text-xs text-rose-600">{vehicleError}</p>
              )}
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
