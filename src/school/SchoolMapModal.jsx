// src/MapModal.jsx
import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
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

export default function MapModal({ gpsList = [], onClose }) {
  // gpsList: [{lat, lon, title, id}] formatında
  const center = gpsList.length
    ? [gpsList[0].lat, gpsList[0].lon]
    : [40.4093, 49.8671]; // Bakı default

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{width: '90vw', maxWidth: 800, height: 500}}>
        <button onClick={onClose} style={{float: 'right'}}>Bağla</button>
        <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%", borderRadius: 12 }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
          />
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
