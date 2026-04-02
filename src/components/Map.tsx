import React, { useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';

interface LatLng {
  lat: number;
  lng: number;
}

interface RouteResult {
  distanceKm: number;
  duration: string;
  distanceText: string;
}

interface MapProps {
  pickup: LatLng | null;
  destination: LatLng | null;
  driverLocation?: LatLng | null;
  onRouteResult?: (result: RouteResult) => void;
}

const mapContainerStyle = { width: '100%', height: '100%' };

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
  ]
};

const TUKTUK_ICON = {
  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z',
  fillColor: '#00B14F',
  fillOpacity: 1,
  strokeWeight: 0,
  scale: 1.5,
};

const Map: React.FC<MapProps> = ({ pickup, destination, driverLocation, onRouteResult }) => {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const routeCalcRef = useRef<string>('');

  const center: LatLng = pickup || { lat: 11.5564, lng: 104.9282 };

  useEffect(() => {
    if (!pickup || !destination) {
      setDirections(null);
      return;
    }

    // Prevent duplicate calculations
    const key = `${pickup.lat},${pickup.lng}-${destination.lat},${destination.lng}`;
    if (routeCalcRef.current === key) return;
    routeCalcRef.current = key;

    const service = new window.google.maps.DirectionsService();
    service.route(
      {
        origin: pickup,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === 'OK' && result) {
          setDirections(result);
          const leg = result.routes[0]?.legs[0];
          if (leg && onRouteResult) {
            onRouteResult({
              distanceKm: (leg.distance?.value ?? 0) / 1000,
              distanceText: leg.distance?.text ?? '',
              duration: leg.duration?.text ?? ''
            });
          }
        }
      }
    );
  }, [pickup, destination]);

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={14}
      options={mapOptions}
    >
      {/* Pickup marker (user) */}
      {pickup && !directions && (
        <Marker
          position={pickup}
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#00B14F',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 3
          }}
          title="Your Location"
        />
      )}

      {/* Destination marker */}
      {destination && !directions && (
        <Marker
          position={destination}
          icon={{
            path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#FF3B30',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2
          }}
          title="Destination"
        />
      )}

      {/* Route */}
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            polylineOptions: { strokeColor: '#00B14F', strokeWeight: 5 },
            suppressMarkers: false
          }}
        />
      )}

      {/* Driver location */}
      {driverLocation && (
        <Marker
          position={driverLocation}
          icon={{
            ...TUKTUK_ICON,
            anchor: new window.google.maps.Point(12, 24)
          }}
          title="Your Driver"
        />
      )}
    </GoogleMap>
  );
};

export default Map;
