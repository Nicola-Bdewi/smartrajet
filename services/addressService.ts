// /src/utils/addressService.ts
import { db } from '@/utils/db';

export interface SavedAddr {
    id: number;
    label: string;
    coords: [number, number];
}

export async function saveAddress(label: string, [lon, lat]: [number, number]) {
    const { lastInsertRowId } = await db.runAsync(
        `INSERT INTO saved_addrs (label, lon, lat) VALUES (?, ?, ?);`,
        label, lon, lat
    );
    console.log(`Saved addr: ${label}`);
    return lastInsertRowId;
}

export async function fetchAddresses(): Promise<SavedAddr[]> {
    const rows = await db.getAllAsync<{ id: number; label: string; lon: number; lat: number }>(
        `SELECT * FROM saved_addrs ORDER BY id DESC;`
    );
    return rows.map(r => ({
        id: r.id,
        label: r.label,
        coords: [r.lon, r.lat],
    }));
}

export async function updateAddress(id: number, newLabel: string) {
    const { changes } = await db.runAsync(
        `UPDATE saved_addrs SET label = ? WHERE id = ?;`,
        newLabel, id
    );
    return changes;
}

export async function deleteAddress(id: number) {
    const { changes } = await db.runAsync(
        `DELETE FROM saved_addrs WHERE id = ?;`,
        id
    );
    return changes;
}
