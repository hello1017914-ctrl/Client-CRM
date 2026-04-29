import { supabase } from './supabaseClient.js';

let prospectListeners = [];

export async function subscribeToProspects(userId, callback) {
    // Initial fetch
    const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .order('created_at', { ascending: false });

    if (!error) {
        const mapped = (data || []).map(p => ({
            ...p,
            instagramHandle: p.instagram_handle,
            followerCount: p.follower_count,
            websiteUrl: p.website_url,
            templateUsed: p.template_used,
            datePitched: p.date_pitched,
            followedUp: p.followed_up,
            createdAt: p.created_at,
            updatedAt: p.updated_at
        }));
        callback(mapped);
    }

    // Subscribe to changes
    const subscription = supabase
        .channel('prospects-all')
        .on('postgres_changes', { event: '*', table: 'prospects' }, async () => {
            const { data: latest } = await supabase
                .from('prospects')
                .select('*')
                .order('created_at', { ascending: false });
            
            const mapped = (latest || []).map(p => ({
                ...p,
                instagramHandle: p.instagram_handle,
                followerCount: p.follower_count,
                websiteUrl: p.website_url,
                templateUsed: p.template_used,
                datePitched: p.date_pitched,
                followedUp: p.followed_up,
                createdAt: p.created_at,
                updatedAt: p.updated_at
            }));
            callback(mapped);
        })
        .subscribe();

    return () => {
        supabase.removeChannel(subscription);
    };
}

export async function addProspect(data) {
    const newProspect = {
        name: data.name,
        instagram_handle: data.instagramHandle,
        platform: data.platform,
        follower_count: data.followerCount || 0,
        niche: data.niche || '',
        email: data.email || '',
        website_url: data.websiteUrl || '',
        template_used: data.templateUsed || '',
        date_pitched: data.datePitched || new Date().toISOString().split('T')[0],
        status: data.status,
        followed_up: data.followedUp || false,
        notes: data.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('prospects').insert([newProspect]);
    if (error) console.error('Error adding prospect:', error);
    return newProspect;
}

export async function updateProspect(id, data) {
    // Map fields to snake_case for Supabase
    const updates = {
        name: data.name,
        instagram_handle: data.instagramHandle,
        platform: data.platform,
        follower_count: data.followerCount,
        niche: data.niche,
        email: data.email,
        website_url: data.websiteUrl,
        template_used: data.templateUsed,
        date_pitched: data.datePitched,
        status: data.status,
        followed_up: data.followedUp,
        notes: data.notes,
        updated_at: new Date().toISOString()
    };

    // Remove undefined fields
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

    const { error } = await supabase
        .from('prospects')
        .update(updates)
        .eq('id', id);
    
    if (error) console.error('Error updating prospect:', error);
}

export async function deleteProspect(id) {
    const { error } = await supabase
        .from('prospects')
        .delete()
        .eq('id', id);
    
    if (error) console.error('Error deleting prospect:', error);
}

export async function bulkUpdateFollowedUp(ids, followedUp) {
    const { error } = await supabase
        .from('prospects')
        .update({ followed_up: followedUp, updated_at: new Date().toISOString() })
        .in('id', ids);
    
    if (error) console.error('Error bulk updating:', error);
}

export async function bulkDeleteProspects(ids) {
    const { error } = await supabase
        .from('prospects')
        .delete()
        .in('id', ids);
    
    if (error) console.error('Error bulk deleting:', error);
}

export async function clearAllProspects() {
    const { error } = await supabase
        .from('prospects')
        .delete()
        .neq('id', '0'); // Delete everything
    
    if (error) console.error('Error clearing prospects:', error);
}
