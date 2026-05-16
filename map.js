// Import d3 as an ESM module
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);

// Mapbox access token (CHANGE TO BE specifically for this website)
mapboxgl.accessToken = 'pk.eyJ1Ijoic3VtbWVyLWdhcnZhaXMiLCJhIjoiY21wN2JobGFsMDBlcjJzcHM0dHozZnlqciJ9.qx0aeS-smu7i5rdS4hkHSA'

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map', // ID of the div where the map will render
    style: 'mapbox://styles/mapbox/light-v11', // Map style
    center: [-71.09415, 42.36027], // [longitude, latitude]
    zoom: 12, // Initial zoom level (adjustable)
    minZoom: 9, // Adjustable
    maxZoom: 18, // Adjustable
});

// Universal bike lane styling for both cities
const bikeLaneStyle = {
    'line-color': 'green',
    'line-width': 3,
    'line-opacity': 0.4,
};

const svg = d3.select('#map').select('svg');

// Loads the bike lanes
map.on('load', async () => {
    // Boston bike lanes
    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
    });
    map.addLayer({
        id: 'boston-bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: bikeLaneStyle,
    });

    // Cambridge bike lanes
    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
    });
    map.addLayer({
        id: 'cambridge-bike-lanes',
        type: 'line',
        source: 'cambridge_route',
        paint: bikeLaneStyle,
    });

    let jsonData;
    try {
        const jsonurl = "https://dsc106.com/labs/lab07/data/bluebikes-stations.json";

        // Await JSON fetch
        jsonData = await d3.json(jsonurl);

        console.log('Loaded JSON Data:', jsonData); // Log to verify structure
    } catch (error) {
        console.error('Error loading JSON:', error); // Handle errors
    }
    let stations = jsonData.data.stations;
    console.log('Stations Array:', stations);



    // Reposition markers on map interactions
    map.on('move', updatePositions); // Update during map movement
    map.on('zoom', updatePositions); // Update during zooming
    map.on('resize', updatePositions); // Update on window resize
    map.on('moveend', updatePositions); // Final adjustment after movement ends

    // Importing bike traffic data
    let trips;
    try {
        const tripDataUrl = "https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv";

        // Await JSON fetch
        trips = await d3.csv(tripDataUrl, (trip) => {   // ✅
            trip.started_at = new Date(trip.started_at);
            trip.ended_at = new Date(trip.ended_at);
            return trip;
});

        console.log('Loaded CSV Trip Data:', trips);
    } catch (error) {
        console.error('Error loading CSV Trip Data:', error); // Handle errors
    }

    const departures = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.start_station_id,
    );

    const arrivals = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.end_station_id,
    );
    stations = stations.map((station) => {
        let id = station.short_name;
        station.arrivals = arrivals.get(id) ?? 0;
        station.departures = departures.get(id) ?? 0;
        station.totalTraffic = station.arrivals + station.departures;
        return station;
    });

        
    const radiusScale = d3.scaleSqrt()
        .domain([0, d3.max(stations, (d) => d.totalTraffic)])
        .range([0, 25]);


    const circles = svg
        .selectAll('circle')
        .data(stations, (d) => d.short_name)
        .enter()
        .append('circle')
        .attr('r', (d) => radiusScale(d.totalTraffic))
        .attr('fill', 'steelblue')
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8)
        .each(function (d) {
            // Step 4.4: Tooltip
            d3.select(this)
                .append('title')
                .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
        });

    // Update positions when map moves
    function updatePositions() {
        circles
            .attr('cx', (d) => getCoords(d).cx)
            .attr('cy', (d) => getCoords(d).cy);
    }

    updatePositions();
    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    map.on('moveend', updatePositions);
});

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat); // Convert lon/lat to Mapbox LngLat
  const { x, y } = map.project(point); // Project to pixel coordinates
  return { cx: x, cy: y }; // Return as object for use in SVG attributes
}