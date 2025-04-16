<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Count from './count.svelte';
  import { variants } from '$lib/variants';

  const { Story } = defineMeta({
    title: 'Count',
    component: Count,
    tags: ['autodocs'],
    argTypes: {
      variant: {
        control: 'select',
        options: variants,
      },
      count: {
        control: 'number',
      },
    },
  });
</script>

<Story name="Default" args={{ count: 0, variant: 'default' }} />
<Story name="Success" args={{ count: 0, variant: 'success' }} />
<Story name="Warning" args={{ count: 0, variant: 'warning' }} />
<Story name="Danger" args={{ count: 0, variant: 'danger' }} />
<Story name="Information" args={{ count: 0, variant: 'information' }} />
<Story name="Error" args={{ count: 0, variant: 'error' }} />
