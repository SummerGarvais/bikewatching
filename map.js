// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);

// Mapbox access token specifically for this website
mapboxgl.accessToken = 'pk.eyJ1Ijoic3VtbWVyLWdhcnZhaXMiLCJhIjoiY21wN2I1NzEwMDBhZDJzcHNlZWc5Y2wyYSJ9.HMU2mwjdXKBuu0ddWufQmA'

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map', // ID of the div where the map will render
    style: 'mapbox://styles/mapbox/streets-v12', // Map style
    center: [-71.09415, 42.36027], // [longitude, latitude]
    zoom: 12, // Initial zoom level (adjustable)
    minZoom: 5, // Adjustable
    maxZoom: 18, // Adjustable
});