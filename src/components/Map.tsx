import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LatLng { lat: number; lng: number }

interface MapProps {
  pickup: LatLng | null;
  destination?: LatLng | null;
  routeCoords?: [number, number][];
  driverLocation?: LatLng | null;
}

// Custom div icons — avoids Leaflet default icon asset issues with Vite
const makeIcon = (color: string, size = 16) =>
  L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const DRIVER_ICON = L.divIcon({
  html: `<div style="
    width:20px;height:20px;
    background:#3B82F6;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 2px 6px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center;
    font-size:10px;
  ">🛺</div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Fits map to show both pickup and destination
const MapController = ({
  pickup,
  destination,
}: {
  pickup: LatLng | null;
  destination: LatLng | null | undefined;
}) => {
  const map = useMap();

  useEffect(() => {
    if (pickup && destination) {
      map.fitBounds(
        [
          [pickup.lat, pickup.lng],
          [destination.lat, destination.lng],
        ],
        { padding: [60, 60] }
      );
    } else if (pickup) {
      map.setView([pickup.lat, pickup.lng], 14);
    }
  }, [pickup?.lat, pickup?.lng, destination?.lat, destination?.lng]);

  return null;
};

const DEFAULT_CENTER: [number, number] = [11.5564, 104.9282]; // Phnom Penh

const Map: React.FC<MapProps> = ({ pickup, destination, routeCoords, driverLocation }) => {
  const center: [number, number] = pickup
    ? [pickup.lat, pickup.lng]
    : DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ width: '100%', height: '100%' }}
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController pickup={pickup} destination={destination} />

      {/* Pickup — green dot */}
      {pickup && (
        <Marker position={[pickup.lat, pickup.lng]} icon={makeIcon('#00B14F', 16)} />
      )}

      {/* Destination — red dot */}
      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={makeIcon('#FF3B30', 16)} />
      )}

      {/* Driver — blue tuk-tuk */}
      {driverLocation && (
        <Marker position={[driverLocation.lat, driverLocation.lng]} icon={DRIVER_ICON} />
      )}

      {/* Route polyline */}
      {routeCoords && routeCoords.length > 0 && (
        <Polyline positions={routeCoords} color="#00B14F" weight={5} opacity={0.85} />
      )}
    </MapContainer>
  );
};

export default Map;
