import React from 'react';
import { WebView } from 'react-native-webview';

export const MapWebView = ({ route, constructions, start, end }: any) => {
    const leafletRouteCoords = route.map(([lon, lat]: [number, number]) => [lat, lon]);
    const routeString = JSON.stringify(leafletRouteCoords);
    const html = `
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
      <style> html, body, #map { height: 100%; margin: 0; } </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([45.5017, -73.5673], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        L.polyline(${routeString}, { color: 'blue' }).addTo(map);
        L.marker([${start.lat}, ${start.lon}]).addTo(map).bindPopup("Start");
        L.marker([${end.lat}, ${end.lon}]).addTo(map).bindPopup("End");

        ${JSON.stringify(constructions)}.forEach(c => {
          L.circleMarker([parseFloat(c.latitude), parseFloat(c.longitude)], {radius: 6, color: 'red'}).addTo(map).bindPopup(c.description || "Construction");
        });
      </script>
    </body>
    </html>
  `;
    return <WebView originWhitelist={['*']} source={{ html }} style={{ flex: 1 }} />;
};
