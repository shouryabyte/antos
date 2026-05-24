import { mockData } from "./mockData";
export type AppData = typeof mockData;

// Demo-only scaffold data for legacy placeholder pages. Production ERP records
// are read/written through Supabase services, not browser storage.
export function loadData(): AppData {
  return mockData;
}

export function saveData(_data: AppData) {
  // Intentionally no-op: do not persist business records to localStorage.
}

export function resetData() {
  return mockData;
}
