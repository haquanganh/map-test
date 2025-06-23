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
import Link from 'next/link';
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

export interface MarkerItem {
  id: string;
  position: LatLngExpression;
  title: string;
  navigateTo: string;
  range: number;
}

interface MarkerFormData {
  title: string;
  navigateTo: string;
  range: number;
}

interface MapProps {
  markers: MarkerItem[];
  height?: string | number;
  showRefreshButton?: boolean;
  showZoomControl?: boolean;
  onAddMarker?: (position: LatLngExpression) => void;
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
  onSave,
  onDelete,
}: {
  isOpen: boolean;
  marker: MarkerItem | null;
  onClose: () => void;
  onSave: (data: MarkerFormData) => void;
  onDelete: () => void;
}) => {
  const [formData, setFormData] = useState<MarkerFormData>({
    title: '',
    navigateTo: '',
    range: 100,
  });

  useEffect(() => {
    if (marker) {
      setFormData({
        title: marker.title,
        navigateTo: marker.navigateTo,
        range: marker.range,
      });
    }
  }, [marker]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this marker?')) {
      onDelete();
      onClose();
    }
  };

  if (!isOpen || !marker) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Edit Spot</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Title:</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="navigateTo">Navigate URL:</label>
            <input
              type="text"
              id="navigateTo"
              value={formData.navigateTo}
              onChange={(e) =>
                setFormData({ ...formData, navigateTo: e.target.value })
              }
              placeholder="e.g., https://example.com or #"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="range">Range (meters):</label>
            <input
              type="number"
              id="range"
              value={formData.range}
              onChange={(e) =>
                setFormData({ ...formData, range: Number(e.target.value) })
              }
              min="1"
              required
            />
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={handleDelete}
              className={styles.deleteButton}
            >
              Delete
            </button>
            <div>
              <button
                type="button"
                onClick={onClose}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button type="submit" className={styles.saveButton}>
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const CenterCrosshair = () => {
  return null; // We'll use CSS-only crosshair instead
};

const MapCenterTracker = ({
  setMapCenter,
}: {
  setMapCenter: (center: [number, number]) => void;
}) => {
  const map = useMap();

  const updateCenter = () => {
    try {
      const center = map.getCenter();
      console.log('Map center update:', center);
      if (center && center.lat !== undefined && center.lng !== undefined) {
        console.log('Setting map center to:', [center.lat, center.lng]);
        setMapCenter([center.lat, center.lng]);
      } else {
        console.warn('Invalid center received:', center);
      }
    } catch (error) {
      console.error('Error getting map center:', error);
    }
  };

  useMapEvents({
    move: updateCenter,
    moveend: updateCenter,
    load: updateCenter,
  });

  // Initialize on component mount with a slight delay
  useEffect(() => {
    const timer = setTimeout(() => {
      updateCenter();
    }, 100);

    return () => clearTimeout(timer);
  }, [map, setMapCenter]);

  return null;
};

const CustomMap = ({
  markers,
  showZoomControl = true,
  onAddMarker,
  onUpdateMarker,
  onDeleteMarker,
}: MapProps) => {
  const mapRef = useRef<Map>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.505, -0.09]);
  const [selectedMarker, setSelectedMarker] = useState<MarkerItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Keep all popups open when markers change
  useEffect(() => {
    // Clear the refs array and resize it to match current markers
    markersRef.current = new Array(markers.length);

    // Use a longer delay to ensure all markers are fully rendered
    const timer = setTimeout(() => {
      markersRef.current.forEach((markerRef) => {
        if (markerRef) {
          markerRef.openPopup();
        }
      });
    }, 500); // Increased timeout to ensure markers are fully rendered

    return () => clearTimeout(timer);
  }, [markers.length]); // Only trigger when marker count changes, not on every marker update

  const handleMarkerClick = (marker: MarkerItem) => {
    setSelectedMarker(marker);
    setIsModalOpen(true);
  };

  const handleModalSave = (data: MarkerFormData) => {
    if (selectedMarker && onUpdateMarker) {
      onUpdateMarker(selectedMarker.id, data);
    }
  };

  const handleModalDelete = () => {
    if (selectedMarker && onDeleteMarker) {
      onDeleteMarker(selectedMarker.id);
    }
  };

  const handleAddMarker = () => {
    console.log('handleAddMarker called, mapCenter:', mapCenter);
    if (onAddMarker) {
      // Better safety check - allow 0 coordinates but not null/undefined/NaN
      if (
        mapCenter[0] !== null &&
        mapCenter[0] !== undefined &&
        mapCenter[1] !== null &&
        mapCenter[1] !== undefined &&
        !isNaN(mapCenter[0]) &&
        !isNaN(mapCenter[1])
      ) {
        const centerPosition: LatLngExpression = [mapCenter[0], mapCenter[1]];
        console.log('Adding marker at:', centerPosition);
        onAddMarker(centerPosition);
      } else {
        console.error('Invalid map center coordinates:', mapCenter);
        alert('Map center not ready yet. Please wait a moment and try again.');
      }
    }
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
        zoom={5}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker, idx) => {
          return (
            <Fragment key={marker.id || idx}>
              <Marker
                key={marker.id || idx}
                position={marker.position}
                ref={(ref) => {
                  if (!ref) return;
                  markersRef.current[idx] = ref;
                }}
                eventHandlers={{
                  click: () => handleMarkerClick(marker),
                }}
              >
                <Popup
                  autoPan={false}
                  closeButton={false}
                  closeOnClick={false}
                  closeOnEscapeKey={false}
                  autoClose={false}
                  keepInView={true}
                >
                  <div>
                    <strong>{marker.title}</strong>
                    <br />
                    <small>Click marker to edit</small>
                  </div>
                </Popup>
              </Marker>
              <Circle center={marker.position} radius={marker.range} />
            </Fragment>
          );
        })}
        <MapWithFitBounds markers={markers} markersRef={markersRef} />
        <MapCenterTracker setMapCenter={setMapCenter} />
      </MapContainer>

      {/* Center Crosshair - CSS Only */}
      <div className={styles.centerCrosshair}>
        <div className={styles.crosshairHorizontal}></div>
        <div className={styles.crosshairVertical}></div>
      </div>

      {/* Add Marker Button */}
      {onAddMarker && (
        <button
          className={styles.addMarkerButton}
          onClick={handleAddMarker}
          title="Add marker at center"
        >
          +
        </button>
      )}

      {/* Coordinates Display */}
      <div className={styles.coordinatesDisplay}>
        {mapCenter[0] !== null &&
        mapCenter[0] !== undefined &&
        mapCenter[1] !== null &&
        mapCenter[1] !== undefined &&
        !isNaN(mapCenter[0]) &&
        !isNaN(mapCenter[1]) ? (
          <>
            Lat: {mapCenter[0].toFixed(6)}, Lng: {mapCenter[1].toFixed(6)}
          </>
        ) : (
          'Loading coordinates...'
        )}
      </div>

      {/* Marker Edit Modal */}
      <MarkerModal
        isOpen={isModalOpen}
        marker={selectedMarker}
        onClose={() => setIsModalOpen(false)}
        onSave={handleModalSave}
        onDelete={handleModalDelete}
      />
    </div>
  );
};

export default CustomMap;
