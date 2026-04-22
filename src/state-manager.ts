import { ModuleState } from './types';

export class StateManager<T extends ModuleState> {
  private state: T | null = null;

  getState(): T | null {
    return this.state;
  }

  setState(update: Omit<T, 'lastSynced'>): void {
    this.state = {
      ...update,
      lastSynced: new Date().toISOString(),
    } as T;
  }

  isChanged(fields: Partial<Omit<T, 'lastSynced' | 'reachable'>>): boolean {
    if (this.state === null) {
      return true;
    }
    return Object.entries(fields).some(
      ([key, value]) => this.state![key as keyof T] !== value,
    );
  }
}
