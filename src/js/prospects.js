import { 
    db, 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    serverTimestamp,
    writeBatch
} from './firebase.js';

let unsubscribeProspects = null;

export function subscribeToProspects(userId, callback) {
    if (unsubscribeProspects) unsubscribeProspects();

    const q = query(
        collection(db, 'prospects'),
        where('userId', '==', userId),
        orderBy('datePitched', 'desc')
    );

    unsubscribeProspects = onSnapshot(q, (snapshot) => {
        const prospects = [];
        snapshot.forEach((doc) => {
            prospects.push({ id: doc.id, ...doc.data() });
        });
        callback(prospects);
    }, (error) => {
        console.error('Prospects subscription error:', error);
    });
}

export async function addProspect(data) {
    return await addDoc(collection(db, 'prospects'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
}

export async function updateProspect(id, data) {
    const prospectRef = doc(db, 'prospects', id);
    return await updateDoc(prospectRef, {
        ...data,
        updatedAt: serverTimestamp()
    });
}

export async function deleteProspect(id) {
    return await deleteDoc(doc(db, 'prospects', id));
}

export async function bulkUpdateFollowedUp(ids, followedUp) {
    const batch = writeBatch(db);
    ids.forEach(id => {
        const ref = doc(db, 'prospects', id);
        batch.update(ref, { followedUp, updatedAt: serverTimestamp() });
    });
    return await batch.commit();
}

export async function bulkDeleteProspects(ids) {
    const batch = writeBatch(db);
    ids.forEach(id => {
        const ref = doc(db, 'prospects', id);
        batch.delete(ref);
    });
    return await batch.commit();
}

export async function clearAllProspects(userId, prospects) {
    const batch = writeBatch(db);
    prospects.forEach(p => {
        if (p.userId === userId) {
            batch.delete(doc(db, 'prospects', p.id));
        }
    });
    return await batch.commit();
}
