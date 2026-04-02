import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import Map from '../components/Map';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LIBRARIES: ('places')[] = ['places'];

interface LatLng { lat: number; lng: number }

interface RouteInfo {
  distanceKm: number;
  distanceText: string;
  duration: string;
}

interface Ride {
  _id: string;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed';
  price: number;
  distance: number;
  duration: string;
  driverId?: { currentLocation: LatLng; userId?: { name: string } } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Searching for driver...', color: 'text-yellow-600' },
  accepted:  { label: 'Driver accepted! On the way', color: 'text-blue-600' },
  ongoing:   { label: 'Ride in progress', color: 'text-grab-green' },
  completed: { label: 'Ride completed!', color: 'text-gray-600' }
};

const UserDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES
  });

  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [destinationName, setDestinationName] = useState('');
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [ride, setRide] = useState<Ride | null>(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get user's current GPS location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPickup({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        // Default to Phnom Penh if geolocation denied
        setPickup({ lat: 11.5564, lng: 104.9282 });
      }
    );
  }, []);

  // Poll ride status when a ride is active
  useEffect(() => {
    if (!ride || ride.status === 'completed') {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/rides/${ride._id}`);
        setRide(res.data);
        if (res.data.status === 'completed') {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // silent
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [ride?._id, ride?.status]);

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry?.location) {
        setDestination({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
        setDestinationName(place.formatted_address || place.name || '');
        setRouteInfo(null);
      }
    }
  }, []);

  const handleBookRide = async () => {
    if (!pickup || !destination || !routeInfo) return;
    setBooking(true);
    setError('');

    try {
      const res = await api.post('/rides', {
        pickup,
        destination,
        distance: routeInfo.distanceKm,
        duration: routeInfo.duration
      });
      setRide(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || 'Failed to book ride';
      setError(msg);
    } finally {
      setBooking(false);
    }
  };

  const handleCancelRide = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setRide(null);
    setDestination(null);
    setDestinationName('');
    setRouteInfo(null);
  };

  const price = routeInfo ? (routeInfo.distanceKm * 0.5).toFixed(2) : null;

  return (
    <div className="relative w-full h-screen">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        {isLoaded ? (
          <Map
            pickup={pickup}
            destination={destination}
            driverLocation={ride?.driverId?.currentLocation ?? null}
            onRouteResult={setRouteInfo}
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
          <div className="card-grab flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛺</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">TukTuk</p>
                <p className="text-xs text-gray-500">Hello, {user?.name}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="text-xs text-gray-500 hover:text-red-500 transition-colors"
            >
              Logout
            </button>
          </div>

          {/* Search bar */}
          {isLoaded && !ride && (
            <div className="card-grab">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-grab-green flex-shrink-0" />
                <p className="text-xs text-gray-500">Your location</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                <Autocomplete
                  onLoad={(ac) => { autocompleteRef.current = ac; }}
                  onPlaceChanged={onPlaceChanged}
                >
                  <input
                    type="text"
                    placeholder="Where are you going?"
                    className="input-grab text-sm"
                    value={destinationName}
                    onChange={(e) => setDestinationName(e.target.value)}
                  />
                </Autocomplete>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom panel */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        <div className="max-w-md mx-auto space-y-3">

          {/* Route info */}
          {routeInfo && !ride && (
            <div className="card-grab">
              <div className="flex justify-between items-center mb-3">
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-500">Distance</p>
                  <p className="font-bold text-gray-800">{routeInfo.distanceText}</p>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="font-bold text-gray-800">{routeInfo.duration}</p>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-500">Price</p>
                  <p className="font-bold text-grab-green">${price}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center mb-3">
                TukTuk ride • $0.50/km
              </p>
              {error && (
                <p className="text-red-500 text-xs mb-2 text-center">{error}</p>
              )}
              <button
                onClick={handleBookRide}
                disabled={booking}
                className="btn-grab w-full"
              >
                {booking ? 'Booking...' : '🛺 Book Ride'}
              </button>
            </div>
          )}

          {/* Active ride status */}
          {ride && (
            <div className="card-grab">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-grab-light rounded-full flex items-center justify-center">
                  <span className="text-xl">🛺</span>
                </div>
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${STATUS_LABELS[ride.status]?.color}`}>
                    {STATUS_LABELS[ride.status]?.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {ride.distance.toFixed(1)} km • {ride.duration} • <span className="text-grab-green font-medium">${ride.price.toFixed(2)}</span>
                  </p>
                </div>
                {ride.status === 'pending' && (
                  <div className="w-5 h-5 border-2 border-grab-green border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              {ride.driverId?.userId?.name && (
                <div className="bg-grab-light rounded-xl p-3 mb-3">
                  <p className="text-xs text-gray-500">Your Driver</p>
                  <p className="font-medium text-gray-800 text-sm">{ride.driverId.userId.name}</p>
                </div>
              )}

              {(ride.status === 'pending' || ride.status === 'accepted') && (
                <button
                  onClick={handleCancelRide}
                  className="w-full py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}

              {ride.status === 'completed' && (
                <button
                  onClick={handleCancelRide}
                  className="btn-grab w-full"
                >
                  Book Another Ride
                </button>
              )}
            </div>
          )}

          {/* Prompt to set destination */}
          {!destination && !ride && isLoaded && (
            <div className="card-grab text-center py-2">
              <p className="text-xs text-gray-500">
                Search for a destination to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
