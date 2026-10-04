import { createContext } from 'svelte';

/**
 * Whether the page has hydrated. The page prerenders with every control in
 * place, but nothing handles a click until it mounts, so controls stay
 * disabled until then.
 */
export const [getReady, setReady] = createContext<() => boolean>();
