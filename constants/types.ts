export interface Suggestion {
    properties: { id: string; label: string; [key: string]: any };
    geometry: { coordinates: [number, number] }; // [lon, lat]
}

export interface EnrichedConstruction {
    lat: number;
    lon: number;
    reason: string;
    footpath: string;
    bus: string;
    street: string;
    startDate: string;
    endDate: string;
    permitId: string;
    status: string;
    org: string;
}
