// File: MapScreen/useHtmlBuilder.ts
import {useEffect, useState} from 'react';
import Constants from 'expo-constants';

const OPENROUTESERVICE_API = Constants?.expoConfig?.extra?.OPENROUTESERVICE_API;

export function useHtmlBuilder({
                                   entraves,
                                   impacts,
                                   fromCoord,
                                   toCoord,
                                   distanceThreshold
                               }: {
    entraves: any[],
    impacts: any[],
    fromCoord: [number, number] | null,
    toCoord: [number, number] | null,
    distanceThreshold: number
})
{
    const [html, setHtml] = useState('');
    const [loadingHtml, setLoadingHtml] = useState(true);

    useEffect(() => {
        (async () => {
            setLoadingHtml(true);

            // Basic check for API key
            if (!OPENROUTESERVICE_API) {
                console.error('OpenRouteService API Key (OPENROUTESERVICE_API) is not configured.');
                setHtml('<div style="height:100%; display:flex; justify-content:center; align-items:center; font-size:18px; color:red;">API Key Not Configured for Map Route.</div>');
                setLoadingHtml(false);
                return;
            }

            const impactMap = new Map<string, any>();
            impacts.forEach(i => {
                if (i.id_request) impactMap.set(i.id_request, i);
            });

            const enriched = entraves
                .map(e => {
                    const imp = impactMap.get(e.id);
                    // Ensure essential properties exist for a valid marker
                    if (!imp || typeof e.latitude === 'undefined' || typeof e.longitude === 'undefined') {
                        return null;
                    }
                    return {
                        lat: +e.latitude,
                        lon: +e.longitude,
                        reason: e.reason_category,
                        footpath: imp.sidewalk_blockedtype,
                        bus: imp.stmimpact_blockedtype,
                        street: imp.name,
                        startDate: e.duration_start_date,
                        endDate: e.duration_end_date,
                        permitId: e.permit_permit_id,
                        status: e.currentstatus,
                        org: e.organizationname,
                    };
                })
                .filter(Boolean); // Remove any null entries

            let routeCoords: [number, number][] = [];
            if (fromCoord && toCoord) {
                // Log coords *before* sending to API to confirm format: [longitude, latitude]
                console.log('Directions Request Coords - From:', fromCoord, 'To:', toCoord);
                try {
                    const routeUrl =
                        `https://api.openrouteservice.org/v2/directions/driving-car` +
                        `?api_key=${OPENROUTESERVICE_API}` +
                        `&start=${fromCoord[0]},${fromCoord[1]}` + // This is the WORKING coordinate order ([lon, lat])
                        `&end=${toCoord[0]},${toCoord[1]}` +     // This is the WORKING coordinate order ([lon, lat])
                        `&geometry_format=geojson`;

                    console.log('Directions API URL:', routeUrl);
                    console.log('Directions API Key available:', !!OPENROUTESERVICE_API);

                    const r = await fetch(routeUrl);
                    const responseText = await r.text(); // Get text first for better error logging

                    console.log('Directions API Response Status:', r.status);
                    console.log('Directions API Raw Response Body (first 500 chars):', responseText.substring(0, 500));

                    if (!r.ok) {
                        console.warn(`Directions API HTTP error! Status: ${r.status}. Response: ${responseText}`);
                        routeCoords = []; // Clear route on error
                    } else {
                        const j = JSON.parse(responseText);
                        if (j.features && j.features[0] && j.features[0].geometry && j.features[0].geometry.coordinates) {
                            routeCoords = j.features[0].geometry.coordinates.map(
                                (c: [number, number]) => [c[1], c[0]] // ORS returns [lon, lat], Leaflet expects [lat, lon]
                            );
                        } else {
                            console.warn("Directions API response did not contain expected geometry.");
                            routeCoords = [];
                        }
                    }
                } catch (err) {
                    console.warn('Route fetch error during API call or JSON parsing:', err);
                    routeCoords = []; // Clear route on error
                }
            }

            const constructionsJSON = JSON.stringify(enriched);
            const routeJSON = JSON.stringify(routeCoords);

            const full = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  <style>
    html, body, #map { margin:0; padding:0; height:100%; }
    
    .marker-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%; /* Circle shape for single icons */
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.6);
      font-size: 14px;
      font-weight: bold;
      color: white;
      text-shadow: 0 0 3px black;
      /* Default size, overridden for two-icons */
      width: 28px;
      height: 28px;
    }

    /* Specific style for the two-icon marker */
    .two-icons {
      border-radius: 14px; /* Pill shape for the wider marker */
      letter-spacing: -3px; /* Pulls emojis closer together */
      width: 44px; /* Wider size for two emojis */
      height: 28px;
    }

    .marker-color-red    { background-color: #D32F2F; } /* Sidewalk + Bus */
    .marker-color-orange { background-color: #F57C00; } /* Sidewalk only */
    .marker-color-blue   { background-color: #1976D2; } /* Bus only */
    .marker-color-gray   { background-color: #616161; } /* Default / Road only */

    .legend {
      position: absolute;
      top: 80px; /* MOVED: Moved down from the top edge to avoid autocomplete overlap */
      right: 10px;
      z-index: 1000;
      background: rgba(255, 255, 255, 0.9);
      padding: 10px;
      border-radius: 5px;
      border: 1px solid #ccc;
      box-shadow: 0 1px 5px rgba(0,0,0,0.4);
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
    }
    .legend h4 {
      margin: 0 0 5px 0;
      text-align: center;
    }
    .legend-item {
      display: flex;
      align-items: center;
      margin-bottom: 4px;
    }
    .legend-color {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      margin-right: 8px;
      border: 1px solid #777;
    }
    /* Ensure Leaflet's default div icon styling doesn't interfere */
    .leaflet-div-icon {
        background: transparent;
        border: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  
  <div id="legend" class="legend">
      <h4>Légende des impacts</h4>
      <div class="legend-item">
          <div class="legend-color marker-color-red"></div>
          <span>Trottoir + Bus</span>
      </div>
      <div class="legend-item">
          <div class="legend-color marker-color-orange"></div>
          <span>Trottoir seulement</span>
      </div>
      <div class="legend-item">
          <div class="legend-color marker-color-blue"></div>
          <span>Bus seulement</span>
      </div>
      <div class="legend-item">
          <div class="legend-color marker-color-gray"></div>
          <span>Route seulement</span>
      </div>
  </div>

  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
  <script src="https://unpkg.com/@turf/turf/turf.min.js"></script>
  <script>
    const map = L.map('map').setView([45.5017, -73.5673], 12);
    const DISTANCE_LIMIT = ${distanceThreshold}; // Max distance for an obstruction to be considered "on route"
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const routeCoords = ${routeJSON};
    let routeLine = null;
    if (routeCoords.length) {
      routeLine = turf.lineString(routeCoords.map(c => [c[1], c[0]])); // turf expects [lon, lat]
      L.polyline(routeCoords, { color: 'black', weight: 5, opacity: 0.7 }).addTo(map); // Leaflet expects [lat, lon]
    }

    const constructions = ${constructionsJSON};
    constructions.forEach(c => {
      // Only add marker if there's a route and the construction has valid coordinates
      if (!routeLine || typeof c.lon !== 'number' || typeof c.lat !== 'number') return;
      
      const pt = turf.point([c.lon, c.lat]);
      const dist = turf.pointToLineDistance(pt, routeLine, { units: 'meters' });
      if (dist > DISTANCE_LIMIT) return; // Skip if too far from the route

      const hasSidewalkImpact = c.footpath?.trim() === 'Barré';
      const hasBusImpact = c.bus?.trim() === 'Déplacer' || c.bus?.trim() === 'Retrait';
      
      // Dynamic marker styling based on impact type
      let iconClass = 'marker-icon';
      let iconContent = '🚧'; // Default emoji for road construction
      let iconSize = [28, 28]; // Default circle size

      if (hasSidewalkImpact && hasBusImpact) {
        iconClass += ' marker-color-red two-icons';
        iconContent = '🚷🚌'; // Combined emoji
        iconSize = [44, 28]; // Wider, pill-shaped
      } else if (hasSidewalkImpact) {
        iconClass += ' marker-color-orange';
        iconContent = '🚷'; // Sidewalk blocked emoji
      } else if (hasBusImpact) {
        iconClass += ' marker-color-blue';
        iconContent = '🚌'; // Bus impact emoji
      } else {
        iconClass += ' marker-color-gray';
        iconContent = '🔨'; // Generic construction/road block emoji
      }
      
      const customIcon = L.divIcon({
        html: iconContent,
        className: iconClass,
        iconSize: iconSize,
        iconAnchor: [iconSize[0] / 2, iconSize[1] / 2], // Center the anchor point
        popupAnchor: [0, -iconSize[1] / 2] // Adjust popup position based on icon height
      });

      // Function to format ISO dates
      function fmtDate(iso) {
      if (!iso) return '—';
      const d = new Date(iso);
      return isNaN(d.getTime()) ? '—' : d.toISOString().split('T')[0];
      }

      // Popup content with detailed information
      const popup = '<strong>' + (c.reason || 'Raison non spécifiée') + '</strong><br/>' +
        '🟧 Trottoir: ' + (c.footpath || 'Non impacté') + '<br/>' +
        '🟥 Bus: ' + (c.bus || 'Non impacté') + '<br/>' +
        '🆔 Permit: ' + (c.permitId || 'N/A') + ' (' + (c.status || 'N/A') + ')<br/>' +
        '📅 Dates: ' + fmtDate(c.startDate) + ' → ' + fmtDate(c.endDate) + '<br/>' +
        '🏢 Org: ' + (c.org || 'N/A') + '<br/>' +
        '🛣️ Rue: ' + (c.street || 'N/A');

      L.marker([c.lat, c.lon], { icon: customIcon }).bindPopup(popup).addTo(map);
    });
  </script>
</body>
</html>`;
            setHtml(full);
            setLoadingHtml(false);
        })();
    }, [entraves, impacts, fromCoord, toCoord, distanceThreshold, OPENROUTESERVICE_API]); // Added API key to dependencies

    return {html, loadingHtml};
}