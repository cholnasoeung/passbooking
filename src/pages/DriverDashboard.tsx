import React, { useState, useEffect, useRef } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import Map from '../components/Map';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LIBRARIES: ('places')[] = ['places'];

interface LatLng { lat: number; lng: number }
interface RideUser { name: string; email: string }
interface Ride {
  _id: string;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed';
  pickup: LatLng;
  destination: LatLng;
  distance: number;
  duration: string;
  price: number;
  userId?: RideUser;
}

const DriverDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES
  });

  const [isOnline, setIsOnline] = useState(false);
  const [myLocation, setMyLocation] = useState<LatLng | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [toggling, setToggling] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);

  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load initial driver status
  useEffect(() => {
    api.get('/driver/status')
      .then((res) => setIsOnline(res.data.isOnline))
      .catch(() => {});
  }, []);

  // Get GPS location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setMyLocation({ lat: 11.5564, lng: 104.9282 })
    );
  }, []);

  // When online: send location every 5 seconds + poll rides
  useEffect(() => {
    if (!isOnline) {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setRides([]);
      return;
    }

    // Send location to backend
    const sendLocation = () => {
      if (!myLocation) return;
      api.put('/driver/location', myLocation).catch(() => {});
    };
    sendLocation();
    locationIntervalRef.current = setInterval(sendLocation, 5000);

    // Poll for ride requests
    const fetchRides = async () => {
      try {
        const res = await api.get('/rides/pending');
        setRides(res.data);
        const active = res.data.find(
          (r: Ride) => r.status === 'accepted' || r.status === 'ongoing'
        );
        if (active) setActiveRide(active);
      } catch {
        // silent
      }
    };
    fetchRides();
    pollIntervalRef.current = setInterval(fetchRides, 4000);

    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOnline, myLocation]);

  // Update location ref when GPS changes
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleToggleOnline = async () => {
    setToggling(true);
    try {
      const res = await api.put('/driver/online');
      setIsOnline(res.data.isOnline);
      if (!res.data.isOnline) {
        setRides([]);
        setActiveRide(null);
      }
    } catch {
      // silent
    } finally {
      setToggling(false);
    }
  };

  const handleAcceptRide = async (rideId: string) => {
    setAccepting(rideId);
    try {
      const res = await api.put(`/rides/${rideId}/accept`);
      setActiveRide(res.data);
      setRides((prev) => prev.filter((r) => r._id !== rideId));
    } catch {
      // silent
    } finally {
      setAccepting(null);
    }
  };

  const handleUpdateStatus = async (rideId: string, status: string) => {
    try {
      const res = await api.put(`/rides/${rideId}/status`, { status });
      if (status === 'completed') {
        setActiveRide(null);
      } else {
        setActiveRide(res.data);
      }
    } catch {
      // silent
    }
  };

  const pendingRides = rides.filter((r) => r.status === 'pending');

  return (
    <div className="relative w-full h-screen">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        {isLoaded ? (
          <Map
            pickup={myLocation}
            destination={activeRide?.pickup ?? null}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <div className="text-gray-500">Loading map...</div>
          </div>
        )}
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="max-w-md mx-auto">
          <div className="card-grab flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isOnline ? 'bg-grab-green' : 'bg-gray-300'
              }`}>
                <span className="text-xl">🛺</span>
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{user?.name}</p>
                <p className={`text-xs font-medium ${isOnline ? 'text-grab-green' : 'text-gray-400'}`}>
                  {isOnline ? '● Online' : '○ Offline'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleOnline}
                disabled={toggling}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isOnline
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-grab-green text-white hover:bg-grab-dark'
                }`}
              >
                {toggling ? '...' : isOnline ? 'Go Offline' : 'Go Online'}
              </button>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 max-h-[60vh] overflow-y-auto">
        <div className="max-w-md mx-auto space-y-3">

          {/* Active ride */}
          {activeRide && (
            <div className="card-grab border-2 border-grab-green">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎯</span>
                <div>
                  <p className="font-semibold text-sm text-gray-800">Active Ride</p>
                  <p className="text-xs text-grab-green font-medium capitalize">{activeRide.status}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-bold text-grab-green">${activeRide.price.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{activeRide.distance.toFixed(1)} km</p>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-grab-green mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Pickup</p>
                    <p className="text-sm text-gray-700">
                      {activeRide.pickup.lat.toFixed(4)}, {activeRide.pickup.lng.toFixed(4)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Destination</p>
                    <p className="text-sm text-gray-700">
                      {activeRide.destination.lat.toFixed(4)}, {activeRide.destination.lng.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>

              {activeRide.userId && (
                <div className="bg-grab-light rounded-xl p-3 mb-3">
                  <p className="text-xs text-gray-500">Passenger</p>
                  <p className="font-medium text-sm text-gray-800">{activeRide.userId.name}</p>
                </div>
              )}

              <div className="flex gap-2">
                {activeRide.status === 'accepted' && (
                  <button
                    onClick={() => handleUpdateStatus(activeRide._id, 'ongoing')}
                    className="btn-grab flex-1 py-2 text-sm"
                  >
                    Start Ride
                  </button>
                )}
                {activeRide.status === 'ongoing' && (
                  <button
                    onClick={() => handleUpdateStatus(activeRide._id, 'completed')}
                    className="btn-grab flex-1 py-2 text-sm"
                  >
                    Complete Ride
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Incoming ride requests */}
          {!activeRide && isOnline && (
            <>
              {pendingRides.length === 0 ? (
                <div className="card-grab text-center py-4">
                  <div className="w-8 h-8 border-2 border-grab-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-medium">Waiting for ride requests...</p>
                </div>
              ) : (
                <>
                  <div className="card-grab py-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {pendingRides.length} Ride Request{pendingRides.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  {pendingRides.map((r) => (
                    <div key={r._id} className="card-grab">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-sm text-gray-800">
                            {r.userId?.name || 'Passenger'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {r.distance.toFixed(1)} km • {r.duration}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-grab-green">${r.price.toFixed(2)}</p>
                      </div>

                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="w-2 h-2 rounded-full bg-grab-green" />
                          {r.pickup.lat.toFixed(4)}, {r.pickup.lng.toFixed(4)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          {r.destination.lat.toFixed(4)}, {r.destination.lng.toFixed(4)}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAcceptRide(r._id)}
                        disabled={accepting === r._id}
                        className="btn-grab w-full py-2 text-sm"
                      >
                        {accepting === r._id ? 'Accepting...' : 'Accept Ride'}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          {/* Offline state */}
          {!isOnline && !activeRide && (
            <div className="card-grab text-center py-5">
              <p className="text-2xl mb-2">😴</p>
              <p className="font-semibold text-gray-700">You are offline</p>
              <p className="text-sm text-gray-500 mt-1">
                Go online to receive ride requests
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
