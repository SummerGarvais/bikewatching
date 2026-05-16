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

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat); // Convert lon/lat to Mapbox LngLat
  const { x, y } = map.project(point); // Project to pixel coordinates
  return { cx: x, cy: y }; // Return as object for use in SVG attributes
}

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes); // Set hours & minutes
  return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
}


function computeStationTraffic(stations, trips) {
  // Compute departures
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

  // Update each station..
  return stations.map((station) => {
    let id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures
    return station;
  });
}



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

    const stations = computeStationTraffic(jsonData.data.stations, trips)

        
    const radiusScale = d3.scaleSqrt()
        .domain([0, d3.max(stations, (d) => d.totalTraffic)])
        .range([0, 25]);

    let stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);
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
                .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`)
        .style('--departure-ratio', (d) =>
            stationFlow(d.depatures / d.totalTraffic)
        );
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

    const timeSlider = document.getElementById('time-slider');
    const selectedTime = document.getElementById('selected-time');
    const anyTimeLabel = document.getElementById('any-time');

    function minutesSinceMidnight(date) {
        return date.getHours() * 60 + date.getMinutes();
    }

    function updateTimeDisplay() {
        let timeFilter = Number(timeSlider.value); // Get slider value

        if (timeFilter === -1) {
            selectedTime.textContent = ''; // Clear time display
            anyTimeLabel.style.display = 'block'; // Show "(any time)"
        } else {
            selectedTime.textContent = formatTime(timeFilter); // Display formatted time
            anyTimeLabel.style.display = 'none'; // Hide "(any time)"
        }

        // Call updateScatterPlot to reflect the changes on the map
        updateScatterPlot(timeFilter);
    }

    function filterTripsbyTime(trips, timeFilter) {
        return timeFilter === -1
            ? trips // If no filter is applied (-1), return all trips
            : trips.filter((trip) => {
                // Convert trip start and end times to minutes since midnight
                const startedMinutes = minutesSinceMidnight(trip.started_at);
                const endedMinutes = minutesSinceMidnight(trip.ended_at);

                // Include trips that started or ended within 60 minutes of the selected time
                return (
                Math.abs(startedMinutes - timeFilter) <= 60 ||
                Math.abs(endedMinutes - timeFilter) <= 60
                );
            });
    }

    function updateScatterPlot(timeFilter) {
        // Get only the trips that match the selected time filter
        const filteredTrips = filterTripsbyTime(trips, timeFilter);

        // Recompute station traffic based on the filtered trips
        const filteredStations = computeStationTraffic(stations, filteredTrips);
        timeFilter === -1 ? radiusScale.range([0, 25]) : radiusScale.range([3, 50]);

        // Update the scatterplot by adjusting the radius of circles
        circles
            .data(filteredStations, (d) => d.short_name)
            .join('circle') // Ensure the data is bound correctly
            .attr('r', (d) => radiusScale(d.totalTraffic)) // Update circle sizes
            .style('--departure-ratio', (d) =>
                stationFlow(d.departures / d.totalTraffic),
            );
    }

    timeSlider.addEventListener('input', updateTimeDisplay);
    updateTimeDisplay();
});

