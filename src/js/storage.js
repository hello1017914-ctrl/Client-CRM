/**
 * Local Storage Persistence Layer
 * Replaces Firestore for a backend-free experience.
 */

const STORAGE_KEYS = {
    PROSPECTS: 'copyquill_prospects',
    REVIEWS: 'copyquill_reviews'
};

// Initialize if empty
if (!localStorage.getItem(STORAGE_KEYS.PROSPECTS)) {
    localStorage.setItem(STORAGE_KEYS.PROSPECTS, JSON.stringify([]));
}
if (!localStorage.getItem(STORAGE_KEYS.REVIEWS)) {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify([]));
}

export const storage = {
    get(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch (e) {
            console.error('Error reading from localStorage', e);
            return [];
        }
    },

    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving to localStorage', e);
        }
    },

    // Collections
    prospects: {
        getAll() {
            return storage.get(STORAGE_KEYS.PROSPECTS);
        },
        saveAll(prospects) {
            storage.save(STORAGE_KEYS.PROSPECTS, prospects);
        }
    },

    reviews: {
        getAll() {
            return storage.get(STORAGE_KEYS.REVIEWS);
        },
        saveAll(reviews) {
            storage.save(STORAGE_KEYS.REVIEWS, reviews);
        }
    }
};
