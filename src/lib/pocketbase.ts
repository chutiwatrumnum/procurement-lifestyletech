import PocketBase from 'pocketbase';

// ใช้ 127.0.0.1 แทน localhost เพื่อความเสถียรบน Mac
const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'https://procurement-lifestyletech.pockethost.io');

pb.autoCancellation(false);

export default pb;

export const isAuthenticated = () => pb.authStore.isValid;
export const getCurrentUser = () => pb.authStore.record;
export const logout = () => pb.authStore.clear();
