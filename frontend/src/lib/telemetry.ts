/** OpenF1 car_data DRS: 10, 12 and 14 mean the flap is open; 0–9 closed or eligible. */
export const isDrsOpen = (drs: number | null) => drs !== null && drs >= 10;
