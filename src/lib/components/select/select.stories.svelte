<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Select from './select.svelte';

  const { Story } = defineMeta({
    title: 'Select',
    component: Select,
    tags: ['autodocs'],
    args: {
      label: 'Select an Option',
      options: [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' },
        { label: 'Option 3', value: 'option3' },
      ],
      disabled: false,
      required: false,
    },
    argTypes: {
      label: { control: 'text' },
      disabled: { control: 'boolean' },
      required: { control: 'boolean' },
    },
  });
</script>

<Story name="Default" />

<Story name="Required" args={{ required: true }} />

<Story name="Disabled" args={{ disabled: true }} />

<Story name="Required and Disabled" args={{ required: true, disabled: true }} />
