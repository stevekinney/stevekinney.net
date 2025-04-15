import type { Icon } from 'lucide-svelte';
import type { ButtonVariants } from './variants';
import type { ExtendElement } from '../component.types';

export type ButtonProps = ExtendElement<
  'button',
  ButtonVariants & {
    label?: string;
    icon?: typeof Icon;
    href?: string;
    loading?: boolean;
    full?: boolean;
    download?: string;
  }
>;
