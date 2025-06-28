// File: MapScreen/useHtmlBuilder.ts
import { useEffect, useState } from 'react';

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
}) {
    const [html, setHtml] = useState('');
    const [loadingHtml, setLoadingHtml] = useState(true);

    useEffect(() => {
        (async () => {
            setLoadingHtml(true);

            const impactMap = new Map<string, any>();
            impacts.forEach(i => {
                if (i.id_request) impactMap.set(i.id_request, i);
            });

            const enriched = entraves
                .map(e => {
                    const imp = impactMap.get(e.id);
                    if (!imp || !e.latitude || !e.longitude) return null;
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
                .filter(Boolean);

            let routeCoords: [number, number][] = [];
            if (fromCoord && toCoord) {
                try {
                    const r = await fetch(
                        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=5b3ce3597851110001cf6248f0026a659ea4487181781678091e0f14` +
                        `&start=${fromCoord[0]},${fromCoord[1]}` +
                        `&end=${toCoord[0]},${toCoord[1]}` +
                        `&geometry_format=geojson`,
                    );
                    const j = await r.json();
                    routeCoords = j.features[0].geometry.coordinates.map(
                        (c: [number, number]) => [c[1], c[0]]
                    );
                } catch (err) {
                    console.warn('Route fetch error', err);
                }
            }

            const constructionsJSON = JSON.stringify(enriched);
            const routeJSON = JSON.stringify(routeCoords);

            const full = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.awesome-markers/2.0.4/leaflet.awesome-markers.css" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.awesome-markers/2.0.4/leaflet.awesome-markers.js"></script>
  <style>
    html, body, #map { margin:0; padding:0; height:100%; }
    .icon-emoji {
      font-size: 14px;
      line-height: 14px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
  <script src="https://unpkg.com/@turf/turf/turf.min.js"></script>
  <script>
    const map = L.map('map').setView([45.5017, -73.5673], 12);
    const DISTANCE_LIMIT = ${distanceThreshold};
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const defaultIcon = L.divIcon({ className: 'icon-emoji', html: '🔨', iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12] });
    const sidewalkIcon = L.divIcon({ className: 'icon-emoji', html: '🔨', iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12] });
    const busIcon = L.divIcon({ className: 'icon-emoji', html: '🔴', iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12] });

    const routeCoords = ${routeJSON};
    let routeLine = null;
    if (routeCoords.length) {
      routeLine = turf.lineString(routeCoords.map(c => [c[1], c[0]]));
      L.polyline(routeCoords, { color: 'black', weight: 4 }).addTo(map);
    }

    const constructions = ${constructionsJSON};
    constructions.forEach(c => {
      if (!routeLine) return;
      const pt = turf.point([c.lon, c.lat]);
      const dist = turf.pointToLineDistance(pt, routeLine, { units: 'meters' });
      if (dist > DISTANCE_LIMIT) return;

      let icon = defaultIcon;
      if (c.footpath?.trim() === 'Barré') icon = sidewalkIcon;
      else if (c.bus?.trim() === 'Déplacer') icon = busIcon;

      function fmtDate(iso) {
        return iso ? iso.split('T')[0] : '—';
      }

      const popup = '<strong>' + c.reason + '</strong><br/>' +
        '🟧 Trottoir: ' + (c.footpath || 'Non impacté') + '<br/>' +
        '🟥 Bus: ' + c.bus + '<br/>' +
        '🆔 Permit: ' + c.permitId + ' (' + c.status + ')<br/>' +
        '📅 Dates: ' + fmtDate(c.startDate) + ' → ' + fmtDate(c.endDate) + '<br/>' +
        '🏢 Org: ' + c.org + '<br/>' +
        '📍 Rue: ' + c.street;

      L.marker([c.lat, c.lon], { icon }).bindPopup(popup).addTo(map);
    });
  </script>
</body>
</html>`;

            setHtml(full);
            setLoadingHtml(false);
        })();
    }, [entraves, impacts, fromCoord, toCoord, distanceThreshold]);

    return { html, loadingHtml };
}
