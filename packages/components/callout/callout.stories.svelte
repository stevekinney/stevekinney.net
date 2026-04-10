<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Callout from './callout.svelte';
  import { variations } from './variations';

  const { Story } = defineMeta({
    title: 'Callout',
    component: Callout,
    tags: ['autodocs'],
    args: {
      description: 'This is a description of the callout.',
      foldable: false,
    },
    argTypes: {
      variant: {
        control: 'select',
        options: variations,
      },
      title: {
        control: 'text',
      },
    },
  });
</script>

<Story name="Default" />

<Story name="Foldable" args={{ foldable: true }} />

<Story
  name="Foldable and Description"
  args={{ foldable: true, description: 'This is a description of the callout.' }}
/>

<Story name="Foldable and Title" args={{ foldable: true, title: 'This is a title' }} />

<Story
  name="Foldable, Title, and Description"
  args={{
    foldable: true,
    title: 'This is a title',
    description: 'This is a description of the callout.',
  }}
/>

<Story name="Abstract" args={{ variant: 'abstract' }} />

<Story name="Bug" args={{ variant: 'bug' }} />

<Story name="Danger" args={{ variant: 'danger' }} />

<Story name="Example" args={{ variant: 'example' }} />

<Story name="Failure" args={{ variant: 'failure' }} />

<Story name="Note" args={{ variant: 'note' }} />

<Story name="Info" args={{ variant: 'info' }} />

<Story name="Question" args={{ variant: 'question' }} />

<Story name="Quote" args={{ variant: 'quote' }} />

<Story name="Success" args={{ variant: 'success' }} />

<Story name="Tip" args={{ variant: 'tip' }} />

<Story name="Todo" args={{ variant: 'todo' }} />

<Story name="Warning" args={{ variant: 'warning' }} />
