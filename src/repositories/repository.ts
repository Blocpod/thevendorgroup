import { z } from "zod";
import { AppState } from "../domain/types";
import { createSeedState } from "../data/seed";

const key = "vendorgroupos-state-v2";
const storedStateSchema = z.object({
  users: z.array(z.object({ id: z.string(), email: z.string(), role: z.string() })),
  session: z.object({ userId: z.string().optional() }),
  clients: z.array(z.object({ id: z.string(), name: z.string(), archived: z.boolean() })),
  projects: z.array(z.object({ id: z.string(), clientId: z.string(), stage: z.string(), archived: z.boolean() })),
  integrations: z.array(z.object({ id: z.string(), state: z.string() })),
  audit: z.array(z.object({ id: z.string(), action: z.string(), timestamp: z.string() }))
}).passthrough();

export function loadState(): AppState {
  const saved = localStorage.getItem(key);
  if (!saved) return createSeedState();
  try {
    const parsed = JSON.parse(saved);
    storedStateSchema.parse(parsed);
    return parsed as AppState;
  } catch {
    return createSeedState();
  }
}

export function saveState(state: AppState) {
  storedStateSchema.parse(state);
  localStorage.setItem(key, JSON.stringify(state));
}

export function resetState() {
  const state = createSeedState();
  saveState(state);
  return state;
}
