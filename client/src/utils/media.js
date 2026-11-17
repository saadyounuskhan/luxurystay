// Files uploaded by staff live on the server (/uploads/...). Built-in files live in client/public (/images, /models).
const API_ORIGIN = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/api\/v1\/?$/, '');
export const assetUrl = (url) => (!url ? '' : url.startsWith('/uploads/') ? API_ORIGIN + url : url);
export const coverOf = (type) => assetUrl(type?.images?.[0]?.url);
