<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { Zap, DollarSign, User, Globe } from 'lucide-svelte';
  import Input from './input.svelte';

  const { Story } = defineMeta({
    title: 'Input',
    component: Input,
    tags: ['autodocs'],
    args: {
      label: 'Input Label',
      value: '',
      details: '',
      placeholder: '',
      required: false,
      unlabeled: false,
      disabled: false,
    },
    argTypes: {
      required: {
        control: 'boolean',
      },
      label: {
        control: 'text',
      },
      details: {
        control: 'text',
      },
      value: {
        control: 'text',
      },
      placeholder: {
        control: 'text',
      },
      disabled: {
        control: 'boolean',
      },
      unlabeled: {
        control: 'boolean',
      },
      before: {
        control: 'select',
        options: ['Zap', 'DollarSign', 'User', 'Globe', 'None'],
        mapping: {
          Zap: Zap,
          DollarSign: DollarSign,
          User: User,
          Globe: Globe,
          None: undefined,
        },
        table: { category: 'Icons' },
      },
      after: {
        control: 'select',
        options: ['Zap', 'DollarSign', 'User', 'Globe', 'None'],
        mapping: {
          Zap: Zap,
          DollarSign: DollarSign,
          User: User,
          Globe: Globe,
          None: undefined,
        },
        table: { category: 'Icons' },
      },
      prefix: {
        control: 'text',
      },
      suffix: {
        control: 'text',
      },
    },
  });
</script>

<Story name="Default" />

<Story name="Required" args={{ required: true }} />

<Story name="Disabled" args={{ disabled: true }} />

<Story name="Unlabeled" args={{ unlabeled: true }} />

<Story name="With Icon Before" args={{ before: Zap }} />

<Story name="With Icon After" args={{ after: DollarSign }} />

<Story name="With Prefix" args={{ prefix: 'https://' }} />

<Story name="With Suffix" args={{ suffix: '.com' }} />

<Story name="With Details" args={{ details: 'This is a helper text.' }} />

<Story name="With Placeholder" args={{ placeholder: 'Placeholder' }} />

<Story name="With Value" args={{ value: 'Value' }} />

<Story
  name="With All"
  args={{
    label: 'Label',
    value: 'Value',
    details: 'Details',
    placeholder: 'Placeholder',
    required: true,
    disabled: true,
    unlabeled: true,
    before: Zap,
    after: DollarSign,
    prefix: 'https://',
    suffix: '.com',
  }}
/>
