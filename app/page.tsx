'use client';

import styles from './page.module.css';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { type LatLngExpression } from 'leaflet';
import { MarkerItem } from './custom-map';
import { useGeolocated } from 'react-geolocated';

const CustomMap = dynamic(() => import('./custom-map'), {
  ssr: false,
});

const SelectionMap = dynamic(() => import('./selection-map'), {
  ssr: false,
});

interface MarkerFormData {
  title: string;
  navigateTo: string;
  range: number;
}

type TabType = 'create' | 'select' | 'process';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const [markers, setMarkers] = useState<MarkerItem[]>([
    {
      id: 'sample-1',
      position: [51.505, -0.09],
      title: 'Spot 1',
      navigateTo: '#',
      range: 100,
    },
    {
      id: 'sample-2',
      position: [51.51, -0.1],
      title: 'Spot 2',
      navigateTo: '#',
      range: 150,
    },
    {
      id: 'sample-3',
      position: [51.5, -0.08],
      title: 'Spot 3',
      navigateTo: '#',
      range: 80,
    },
  ]);
  const [selectedMarkers, setSelectedMarkers] = useState<string[]>([]);
  const [processedMarkers, setProcessedMarkers] = useState<string[]>([]);

  const {
    coords,
    positionError: error,
    isGeolocationEnabled,
  } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
    },
    userDecisionTimeout: 5000,
  });

  // Process geolocation coordinates
  const currentLocation: [number, number] | null = coords
    ? [coords.latitude, coords.longitude]
    : null;

  const generateId = () =>
    `marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleAddMarker = (position: LatLngExpression) => {
    // Validate position before adding marker
    if (!position) {
      console.error('Invalid position provided to handleAddMarker');
      return;
    }

    // Check if position is array format [lat, lng]
    if (Array.isArray(position)) {
      const [lat, lng] = position;
      if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
        console.error('Invalid coordinates in position array:', position);
        return;
      }
    }

    const newMarker: MarkerItem = {
      id: generateId(),
      position,
      title: `Marker ${markers.length + 1}`,
      navigateTo: '#',
      range: 100, // 100 meter radius
    };
    console.log('Adding new marker:', newMarker);
    setMarkers([...markers, newMarker]);
  };

  const handleUpdateMarker = (id: string, data: MarkerFormData) => {
    setMarkers(
      markers.map((marker) =>
        marker.id === id ? { ...marker, ...data } : marker
      )
    );
  };

  const handleDeleteMarker = (id: string) => {
    setMarkers(markers.filter((marker) => marker.id !== id));
    // Also remove from selected if it was selected
    setSelectedMarkers((prev) => prev.filter((markerId) => markerId !== id));
    // Also remove from processed if it was processed
    setProcessedMarkers((prev) => prev.filter((markerId) => markerId !== id));
  };

  const handleMarkerSelection = (markerId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedMarkers((prev) => [...prev, markerId]);
    } else {
      setSelectedMarkers((prev) => prev.filter((id) => id !== markerId));
    }
  };

  const handleSubmitSelected = () => {
    const selectedMarkerData = markers.filter((marker) =>
      selectedMarkers.includes(marker.id)
    );

    console.log('Submitting selected markers:', selectedMarkerData);
    alert(
      `Submitting ${selectedMarkers.length} selected markers!\nCheck console for details.`
    );

    // Here you would typically send the data to your backend
    // Example: await submitMarkers(selectedMarkerData);
  };

  const handleSelectAll = () => {
    setSelectedMarkers(markers.map((marker) => marker.id));
  };

  const handleDeselectAll = () => {
    setSelectedMarkers([]);
  };

  const handleProcessMarkerSelection = (
    markerId: string,
    isSelected: boolean
  ) => {
    if (isSelected) {
      setProcessedMarkers((prev) => [...prev, markerId]);
    } else {
      setProcessedMarkers((prev) => prev.filter((id) => id !== markerId));
    }
  };

  const handleProcessAll = () => {
    setProcessedMarkers(markers.map((marker) => marker.id));
  };

  const handleProcessNone = () => {
    setProcessedMarkers([]);
  };

  const handleProcessSubmit = () => {
    const processedMarkerData = markers.filter((marker) =>
      processedMarkers.includes(marker.id)
    );

    console.log('Processing selected markers:', processedMarkerData);
    alert(
      `Processing ${processedMarkers.length} markers!\nCheck console for details.`
    );

    // Here you would proceed to the next step in your workflow
    // Example: await processMarkers(processedMarkerData);
    // Example: router.push('/next-step');
  };

  return (
    <div className={styles.page}>
      {/* Geolocation Status */}
      {!isGeolocationEnabled && (
        <div className={styles.locationAlert}>
          📍 Enable location access to center map at your current position
        </div>
      )}
      {error && (
        <div className={styles.locationError}>
          ❌ Location access denied or unavailable
        </div>
      )}
      {/* Tab Navigation */}
      <div className={styles.tabContainer}>
        <div className={styles.tabHeader}>
          <button
            className={`${styles.tab} ${
              activeTab === 'create' ? styles.active : ''
            }`}
            onClick={() => setActiveTab('create')}
          >
            Add Spots ({markers.length})
          </button>
          <button
            className={`${styles.tab} ${
              activeTab === 'select' ? styles.active : ''
            }`}
            onClick={() => setActiveTab('select')}
          >
            Select Spots ({selectedMarkers.length}/{markers.length})
          </button>
          {/* <button
            className={`${styles.tab} ${
              activeTab === 'process' ? styles.active : ''
            }`}
            onClick={() => setActiveTab('process')}
          >
            Process Markers ({processedMarkers.length}/{markers.length})
          </button> */}
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'create' ? (
            <div className={styles.mapContainer}>
              <CustomMap
                markers={markers}
                currentLocation={currentLocation}
                onAddMarker={handleAddMarker}
                onUpdateMarker={handleUpdateMarker}
                onDeleteMarker={handleDeleteMarker}
              />
            </div>
          ) : activeTab === 'select' ? (
            <div className={styles.selectionContainer}>
              <div className={styles.selectionControls}>
                <button
                  onClick={handleSelectAll}
                  className={styles.controlButton}
                  disabled={markers.length === 0}
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAll}
                  className={styles.controlButton}
                  disabled={selectedMarkers.length === 0}
                >
                  Deselect All
                </button>
                <button
                  onClick={handleSubmitSelected}
                  className={styles.submitButton}
                  disabled={selectedMarkers.length === 0}
                >
                  Submit Selected ({selectedMarkers.length})
                </button>
              </div>

              <div className={styles.mapContainer}>
                <SelectionMap
                  markers={markers}
                  selectedMarkers={selectedMarkers}
                  currentLocation={currentLocation}
                  onMarkerSelection={handleMarkerSelection}
                  onUpdateMarker={handleUpdateMarker}
                  onDeleteMarker={handleDeleteMarker}
                />
              </div>
            </div>
          ) : (
            <div className={styles.selectionContainer}>
              <div className={styles.selectionControls}>
                <button
                  onClick={handleProcessAll}
                  className={styles.controlButton}
                  disabled={markers.length === 0}
                >
                  Process All
                </button>
                <button
                  onClick={handleProcessNone}
                  className={styles.controlButton}
                  disabled={processedMarkers.length === 0}
                >
                  Process None
                </button>
                <button
                  onClick={handleProcessSubmit}
                  className={styles.submitButton}
                  disabled={processedMarkers.length === 0}
                >
                  Proceed with {processedMarkers.length} Markers
                </button>
              </div>

              <div className={styles.mapContainer}>
                <SelectionMap
                  markers={markers}
                  selectedMarkers={processedMarkers}
                  currentLocation={currentLocation}
                  onMarkerSelection={handleProcessMarkerSelection}
                  onUpdateMarker={handleUpdateMarker}
                  onDeleteMarker={handleDeleteMarker}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
