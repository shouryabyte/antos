import { create } from "zustand";
import { loadData, resetData, saveData, type AppData } from "../lib/storage";
import { uid } from "../lib/utils";

type Collection = keyof AppData;
type AppState = AppData & {
  role: string;
  setRole: (role:string) => void;
  addItem: <K extends Collection>(key:K, item: Omit<AppData[K][number], "id"> & { id?: string }) => void;
  updateItem: <K extends Collection>(key:K, id:string, patch: Partial<AppData[K][number]>) => void;
  deleteItem: <K extends Collection>(key:K, id:string) => void;
  replaceData: (data: AppData) => void;
  reset: () => void;
};

const seed = loadData();
export const useAppStore = create<AppState>((set, get) => ({
  ...seed,
  role: "Super Admin",
  setRole: (role) => set({ role }),
  addItem: (key, item) => set((state) => {
    const next = { ...state, [key]: [...state[key], { id: item.id || uid(String(key)), ...item }] } as AppState;
    saveData(strip(next)); return next;
  }),
  updateItem: (key, id, patch) => set((state) => {
    const next = { ...state, [key]: state[key].map((x:any) => x.id === id ? { ...x, ...patch } : x) } as AppState;
    saveData(strip(next)); return next;
  }),
  deleteItem: (key, id) => set((state) => {
    const next = { ...state, [key]: state[key].filter((x:any) => x.id !== id) } as AppState;
    saveData(strip(next)); return next;
  }),
  replaceData: (data) => set((state) => {
    const next = { ...state, ...data };
    saveData(strip(next));
    return next;
  }),
  reset: () => set({ ...resetData() })
}));

function strip(state: AppState): AppData {
  const { role, setRole, addItem, updateItem, deleteItem, replaceData, reset, ...data } = state;
  void role; void setRole; void addItem; void updateItem; void deleteItem; void replaceData; void reset;
  return data;
}
