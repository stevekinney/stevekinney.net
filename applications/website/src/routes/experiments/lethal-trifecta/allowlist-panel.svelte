<script lang="ts">
  import { domainMatches, exfiltrationDomains, normalizeDomain } from './domains';

  type Props = {
    allowlist: string[];
    excludedNetworkCommand: boolean;
    denyOn: boolean;
    ready: boolean;
    onAllowlist: (domains: string[]) => void;
    onExcluded: (on: boolean) => void;
  };

  const { allowlist, excludedNetworkCommand, denyOn, ready, onAllowlist, onExcluded }: Props =
    $props();

  const known = new Set(exfiltrationDomains.map(({ host }) => host));
  const others = $derived(allowlist.filter((entry) => !known.has(normalizeDomain(entry))));

  const toggle = (host: string, on: boolean): void =>
    onAllowlist(
      on ? [...allowlist, host] : allowlist.filter((entry) => normalizeDomain(entry) !== host),
    );
</script>

<div class="space-y-4" data-testid="allowlist">
  <fieldset class="space-y-2">
    <legend class="font-bold text-slate-900 dark:text-white">Allowlisted domains</legend>
    <p class="text-sm text-slate-600 dark:text-slate-300">
      {denyOn
        ? 'Default-deny egress is on, so these are the only hosts the shell can reach. Each of these is a good place to put stolen data.'
        : 'These only matter once default-deny egress is on. Until then the shell can reach every host.'}
    </p>
    {#each exfiltrationDomains as domain (domain.host)}
      {@const covered = allowlist.some((entry) => domainMatches(entry, domain.host))}
      <label class="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={allowlist.some((entry) => normalizeDomain(entry) === domain.host)}
          disabled={!ready}
          onchange={(event) => toggle(domain.host, event.currentTarget.checked)}
          class="accent-primary-600 mt-0.5 size-4 flex-none"
        />
        <span class="min-w-0 [overflow-wrap:anywhere]">
          <code class="font-mono text-slate-900 dark:text-white">{domain.host}</code>
          <span class="text-slate-600 dark:text-slate-300">— {domain.reason}</span>
          {#if covered && !allowlist.some((entry) => normalizeDomain(entry) === domain.host)}
            <span class="font-semibold text-rose-700 dark:text-rose-300">
              Covered by a wildcard in your settings.</span
            >
          {/if}
        </span>
      </label>
    {/each}
    {#if others.length > 0}
      <p class="text-sm [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300">
        Also on the allowlist, from your settings: {others.join(', ')}. They stay on this page and
        out of any link.
      </p>
    {/if}
  </fieldset>

  <label class="flex items-start gap-2 text-sm">
    <input
      type="checkbox"
      checked={excludedNetworkCommand}
      disabled={!ready}
      onchange={(event) => onExcluded(event.currentTarget.checked)}
      class="accent-primary-600 mt-0.5 size-4 flex-none"
    />
    <span class="min-w-0">
      <span class="font-medium text-slate-900 dark:text-white"
        >excludedCommands includes a network tool</span
      >
      <span class="text-slate-600 dark:text-slate-300"
        >— such as docker or curl. Excluded commands run outside the sandbox even with retries off.</span
      >
    </span>
  </label>
</div>
