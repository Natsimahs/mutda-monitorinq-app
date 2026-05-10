// src/MapModal.jsx
import React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from 'leaflet';

const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapBounds({ gpsList }) {
  const map = useMap();
  React.useEffect(() => {
    if (gpsList && gpsList.length > 0) {
      const bounds = L.latLngBounds(gpsList.map(g => [g.lat, g.lon]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [gpsList, map]);
  return null;
}

export default function MapModal({ gpsList = [], onClose }) {
  // Əgər siyahı boşdursa Azərbaycanın mərkəzi nöqtəsi
  const defaultCenter = [40.1431, 47.5769];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{width: '90vw', maxWidth: 800, height: 500}}>
        <button onClick={onClose} style={{float: 'right'}}>Bağla</button>
        <MapContainer center={defaultCenter} zoom={7} style={{ height: "100%", width: "100%", borderRadius: 12 }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
          />
          <MapBounds gpsList={gpsList} />
          {gpsList.map((gps, idx) =>
            <Marker key={gps.id || idx} position={[gps.lat, gps.lon]}>
              <Popup>
                <div><b>{gps.title || 'Hesabat'}</b></div>
                <div>Koordinat: {gps.lat}, {gps.lon}</div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
