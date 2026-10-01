/** Resolve a data image path ("img/p/croissant.png") against the app base URL. */
export const asset = (path: string): string => import.meta.env.BASE_URL + path.replace(/^\//, '');
