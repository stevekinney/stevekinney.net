import type { LucideIcon } from '@lucide/svelte';
import type { ButtonVariants } from './variants';
import type { ExtendElement } from '../component.types';

export type ButtonProps =
  | ExtendElement<
      'button',
      ButtonVariants & {
        label?: string;
        icon?: LucideIcon;
        href?: string;
        loading?: boolean;
        full?: boolean;
        download?: string;
      }
    >
  | ExtendElement<
      'a',
      ButtonVariants & {
        label?: string;
        icon?: LucideIcon;
        loading?: boolean;
        full?: boolean;
        download?: string;
      }
    >;
