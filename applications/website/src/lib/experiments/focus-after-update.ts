import { tick } from 'svelte';

/** An element's id, or a function that finds the element once the update has rendered. */
export type FocusTarget = string | (() => HTMLElement | null | undefined);

/**
 * Moves focus once Svelte has applied the state change that was just made.
 *
 * Revealing a prediction usually unmounts or disables the control a person
 * just used, which drops focus to `<body>` and leaves keyboard and screen
 * reader users at the top of the page. Call this right after the change and
 * point it at the container that now holds the result. The container needs
 * `tabindex="-1"` and a role with a name, such as `role="group"` with
 * `aria-labelledby`, so focusing it says what it is.
 */
export const focusAfterUpdate = async (target: FocusTarget): Promise<void> => {
  await tick();
  const element = typeof target === 'string' ? document.getElementById(target) : target();
  element?.focus();
};
