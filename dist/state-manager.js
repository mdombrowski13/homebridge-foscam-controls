"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateManager = void 0;
class StateManager {
    constructor() {
        this.state = null;
    }
    getState() {
        return this.state;
    }
    setState(update) {
        this.state = {
            ...update,
            lastSynced: new Date().toISOString(),
        };
    }
    isChanged(fields) {
        if (this.state === null) {
            return true;
        }
        return Object.entries(fields).some(([key, value]) => this.state[key] !== value);
    }
}
exports.StateManager = StateManager;
