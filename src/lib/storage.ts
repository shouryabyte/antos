import { mockData } from "./mockData";
const KEY = "antos-store-v1";
export type AppData = typeof mockData;
export function loadData(): AppData {
  const raw = localStorage.getItem(KEY);
  if (!raw) { localStorage.setItem(KEY, JSON.stringify(mockData)); return mockData; }
  try { return { ...mockData, ...JSON.parse(raw) }; } catch { return mockData; }
}
export function saveData(data: AppData) { localStorage.setItem(KEY, JSON.stringify(data)); }
export function resetData() { localStorage.setItem(KEY, JSON.stringify(mockData)); return mockData; }
