import { ModuleState } from './types';
export declare class StateManager<T extends ModuleState> {
    private state;
    getState(): T | null;
    setState(update: Omit<T, 'lastSynced'>): void;
    isChanged(fields: Partial<Omit<T, 'lastSynced' | 'reachable'>>): boolean;
}
