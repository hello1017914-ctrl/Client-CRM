import { storage } from './storage.js';

let prospectListeners = [];

export function subscribeToProspects(userId, callback) {
    // In local storage mode, we don't need userId as it's personal to the browser
    const prospects = storage.prospects.getAll();
    callback(prospects);
    
    prospectListeners.push(callback);
    
    return () => {
        prospectListeners = prospectListeners.filter(l => l !== callback);
    };
}

function notifyListeners() {
    const prospects = storage.prospects.getAll();
    prospectListeners.forEach(callback => callback(prospects));
}

export async function addProspect(data) {
    const prospects = storage.prospects.getAll();
    const newProspect = {
        ...data,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    prospects.push(newProspect);
    storage.prospects.saveAll(prospects);
    notifyListeners();
    return newProspect;
}

export async function updateProspect(id, data) {
    const prospects = storage.prospects.getAll();
    const index = prospects.findIndex(p => p.id === id);
    if (index !== -1) {
        prospects[index] = {
            ...prospects[index],
            ...data,
            updatedAt: new Date().toISOString()
        };
        storage.prospects.saveAll(prospects);
        notifyListeners();
    }
}

export async function deleteProspect(id) {
    const prospects = storage.prospects.getAll();
    const filtered = prospects.filter(p => p.id !== id);
    storage.prospects.saveAll(filtered);
    notifyListeners();
}

export async function bulkUpdateFollowedUp(ids, followedUp) {
    const prospects = storage.prospects.getAll();
    ids.forEach(id => {
        const index = prospects.findIndex(p => p.id === id);
        if (index !== -1) {
            prospects[index] = {
                ...prospects[index],
                followedUp,
                updatedAt: new Date().toISOString()
            };
        }
    });
    storage.prospects.saveAll(prospects);
    notifyListeners();
}

export async function bulkDeleteProspects(ids) {
    const prospects = storage.prospects.getAll();
    const filtered = prospects.filter(p => !ids.includes(p.id));
    storage.prospects.saveAll(filtered);
    notifyListeners();
}

export async function clearAllProspects() {
    storage.prospects.saveAll([]);
    notifyListeners();
}
