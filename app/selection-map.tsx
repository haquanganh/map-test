'use client';

import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css';
import 'leaflet-defaulticon-compatibility';

import {
  LatLng,
  LatLngBounds,
  Marker as LeafletMarker,
  type LatLngExpression,
  type LatLngLiteral,
  type Map,
} from 'leaflet';
import { Fragment, RefObject, useEffect, useRef, useState } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';

import styles from './custom-map.module.scss';
import { MarkerItem } from './custom-map';

interface MarkerFormData {
  title: string;
  navigateTo: string;
  range: number;
}

interface SelectionMapProps {
  markers: MarkerItem[];
  selectedMarkers: string[];
  onMarkerSelection: (markerId: string, isSelected: boolean) => void;
  onUpdateMarker?: (id: string, data: MarkerFormData) => void;
  onDeleteMarker?: (id: string) => void;
}

const MapWithFitBounds = ({
  markers,
  markersRef,
}: {
  markers: MarkerItem[];
  markersRef: RefObject<LeafletMarker[]>;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!markers || markers.length === 0) return;

    const bounds = new LatLngBounds([]);

    markers.forEach(({ position, range }) => {
      // Safety check for position
      if (!position) return;

      const { lat, lng } = position as LatLngLiteral;

      // Check if lat and lng are valid numbers
      if (
        lat !== undefined &&
        lng !== undefined &&
        !isNaN(lat) &&
        !isNaN(lng)
      ) {
        const latLng = new LatLng(lat, lng);
        const markerBounds = latLng.toBounds(range);
        bounds.extend(markerBounds);
      } else {
        console.warn('Invalid marker position:', position);
      }
    });

    // Only fit bounds if we have valid bounds
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 18,
      });
    }
  }, [map, markers]);

  return null;
};

const MarkerModal = ({
  isOpen,
  marker,
  onClose,
}: {
  isOpen: boolean;
  marker: MarkerItem | null;
  onClose: () => void;
}) => {
  if (!isOpen || !marker) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Spot Details</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label>Title:</label>
            <div className={styles.readOnlyField}>{marker.title}</div>
          </div>

          <div className={styles.formGroup}>
            <label>Navigate URL:</label>
            <div className={styles.readOnlyField}>
              {marker.navigateTo || 'Not specified'}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Range:</label>
            <div className={styles.readOnlyField}>{marker.range} meters</div>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.saveButton}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SelectionMap = ({
  markers,
  selectedMarkers,
  onMarkerSelection,
  onUpdateMarker,
  onDeleteMarker,
}: SelectionMapProps) => {
  const mapRef = useRef<Map>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MarkerItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Keep all popups open when markers change
  useEffect(() => {
    // Clear the refs array and resize it to match current markers
    markersRef.current = new Array(markers.length);

    // Use a delay to ensure all markers are fully rendered
    const timer = setTimeout(() => {
      markersRef.current.forEach((markerRef) => {
        if (markerRef) {
          markerRef.openPopup();
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [markers.length]);

  const handleTitleClick = (marker: MarkerItem) => {
    setSelectedMarker(marker);
    setIsModalOpen(true);
  };

  const toggleMarkerSelection = (markerId: string) => {
    const isSelected = selectedMarkers.includes(markerId);
    onMarkerSelection(markerId, !isSelected);
  };

  return (
    <div className={styles.mapWrapper}>
      <MapContainer
        center={[51.505, -0.09]}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
        className={styles.map}
        ref={mapRef}
        zoomControl
        zoom={13}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker, idx) => {
          const isSelected = selectedMarkers.includes(marker.id);
          return (
            <Fragment key={marker.id || idx}>
              <Marker
                key={marker.id || idx}
                position={marker.position}
                ref={(ref) => {
                  if (!ref) return;
                  markersRef.current[idx] = ref;
                }}
                opacity={isSelected ? 1 : 0.6}
              >
                <Popup
                  autoPan={false}
                  closeButton={false}
                  closeOnClick={false}
                  closeOnEscapeKey={false}
                  autoClose={false}
                  keepInView={true}
                >
                  <div className={styles.selectionPopup}>
                    <div className={styles.popupContent}>
                      <strong
                        className={styles.clickableTitle}
                        onClick={() => handleTitleClick(marker)}
                      >
                        {marker.title}
                      </strong>
                    </div>
                    <div className={styles.popupActions}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMarkerSelection(marker.id)}
                          className={styles.markerCheckbox}
                        />
                      </label>
                    </div>
                  </div>
                </Popup>
              </Marker>
              <Circle
                center={marker.position}
                radius={marker.range}
                pathOptions={{
                  color: isSelected ? '#007bff' : '#ff4444',
                  fillColor: isSelected ? '#007bff' : '#ff4444',
                  fillOpacity: isSelected ? 0.3 : 0.1,
                  weight: isSelected ? 3 : 2,
                }}
              />
            </Fragment>
          );
        })}
        <MapWithFitBounds markers={markers} markersRef={markersRef} />
      </MapContainer>

      {/* Marker Details Modal */}
      <MarkerModal
        isOpen={isModalOpen}
        marker={selectedMarker}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default SelectionMap;
