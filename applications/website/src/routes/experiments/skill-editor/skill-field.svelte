<script lang="ts">
  import CodeText from '$lib/experiments/editor-fields/code-text.svelte';
  import FieldShell from '$lib/experiments/editor-fields/field-shell.svelte';
  import type { FieldIssue } from '$lib/experiments/editor-fields/field-issue';
  import { hintClasses } from '$lib/experiments/editor-fields/field-styles';
  import ListField from '$lib/experiments/editor-fields/list-field.svelte';
  import SelectField from '$lib/experiments/editor-fields/select-field.svelte';
  import TextField from '$lib/experiments/editor-fields/text-field.svelte';
  import PermissionRuleEditor from '$lib/experiments/tool-rules/permission-rule-editor.svelte';
  import ToolAccessEditor from '$lib/experiments/tool-rules/tool-access-editor.svelte';

  import {
    fieldHint,
    fieldId,
    rawValue,
    readBoolean,
    readList,
    readText,
    suggestionsFor,
    writeField,
  } from './skill-fields';
  import type { FieldDefinition } from './skill-fields';
  import type { DraftKey, SkillDocument, SkillOptions, Target } from './skill-document';
  import ToolDependencies from './tool-dependencies.svelte';

  type Props = {
    field: FieldDefinition;
    skill: SkillDocument;
    target: Target;
    options: SkillOptions;
    issues: readonly FieldIssue[];
    /** Whether the workbench has loaded, which structured fields need to parse their YAML. */
    ready: boolean;
    onChange: (skill: SkillDocument) => void;
    onDraft: (key: DraftKey, text: string) => void;
  };

  const { field, skill, target, options, issues, ready, onChange, onDraft }: Props = $props();

  const id = $derived(fieldId(field));
  const hint = $derived(fieldHint(field, { target, skill }));
  const raw = $derived(rawValue(skill, field));
  const suggestions = $derived(suggestionsFor(field, options));

  const booleanOptions = [{ value: 'true' }, { value: 'false' }];
</script>

{#if field.kind === 'tools' && target === 'claude' && field.toolRole === 'pre-approve'}
  <FieldShell {id} label={field.label} fieldKey={field.key} {issues} group>
    <p class={hintClasses}><CodeText text={hint} /></p>
    <PermissionRuleEditor
      {id}
      rules={readList(raw, field.split)}
      onChange={(rules) => onChange(writeField(skill, field, rules))}
    />
  </FieldShell>
{:else if field.kind === 'tools' && target === 'claude' && field.toolRole === 'remove'}
  <FieldShell {id} label={field.label} fieldKey={field.key} {issues} group>
    <ToolAccessEditor
      {id}
      access={{ mode: 'inherit', allowed: [], blocked: readList(raw, field.split) }}
      onChange={(access) => onChange(writeField(skill, field, access.blocked))}
      allowList={false}
      blockedKey={field.key}
      checkedMeaning={hint}
      locked={{
        EndConversation:
          '`disallowed-tools` can’t remove `EndConversation` while any other tool remains.',
      }}
    />
  </FieldShell>
{:else if field.kind === 'dependencies'}
  <FieldShell {id} label={field.label} fieldKey={field.key} {hint} {issues} group>
    <ToolDependencies {id} {skill} {onChange} />
  </FieldShell>
{:else if field.kind === 'list' || field.kind === 'tools'}
  <ListField
    {id}
    label={field.label}
    fieldKey={field.key}
    values={readList(raw, field.split)}
    onChange={(values) => onChange(writeField(skill, field, values))}
    {hint}
    {issues}
    {suggestions}
    placeholder={field.placeholder}
  />
{:else if field.kind === 'boolean' || field.kind === 'select'}
  <SelectField
    {id}
    label={field.label}
    fieldKey={field.key}
    value={field.kind === 'boolean' ? readBoolean(raw) : readText(raw)}
    onChange={(value) => onChange(writeField(skill, field, value))}
    options={field.kind === 'boolean'
      ? booleanOptions
      : (field.options ? options[field.options] : []).map((value) => ({ value }))}
    unsetLabel={field.unsetLabel}
    {hint}
    {issues}
  />
{:else if field.kind === 'draft' && field.draft}
  {@const draft = field.draft}
  <TextField
    {id}
    label={field.label}
    fieldKey={field.key}
    value={skill.drafts[draft]}
    onChange={(text) => onDraft(draft, text)}
    rows={field.rows}
    monospace
    disabled={!ready}
    placeholder={field.placeholder}
    {hint}
    {issues}
  />
{:else}
  <TextField
    {id}
    label={field.label}
    fieldKey={field.key}
    value={readText(raw)}
    onChange={(text) => onChange(writeField(skill, field, text))}
    rows={field.rows}
    limit={field.limit}
    monospace={field.monospace}
    placeholder={field.placeholder}
    {suggestions}
    {hint}
    {issues}
  />
{/if}
