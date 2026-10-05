import {
  formatDefects,
  formatLines,
  formatMinutes,
  formatNumber,
  formatSignedLines,
  plural,
} from './display';
import { allFreshEscapedPerDay, dailyBalance, simulate } from './model';
import type { Simulation } from './model';
import type { Scenario } from './scenario';

/** Says how many agents you can keep reviewed, in words. */
export const sustainableText = (sustainable: number | null): string =>
  sustainable === null
    ? 'any number of agents, since none of them opens anything'
    : `${sustainable} ${plural(sustainable, 'agent')}`;

/** What the oldest waiting pull request looks like at the end of a day of the queue. */
export const oldestText = (day: Simulation['days'][number]): string =>
  day.oldestOpenedDay === null || day.oldestAge === null
    ? 'nothing waiting'
    : day.oldestAge === 0
      ? `opened that day (day ${day.oldestOpenedDay})`
      : `opened on day ${day.oldestOpenedDay}, ${day.oldestAge} working ${plural(day.oldestAge, 'day')} earlier`;

/** A Markdown block with the inputs, the sustainable count, the backlog, and the defect projection. */
export const summaryToMarkdown = (scenario: Scenario): string => {
  const balance = dailyBalance(scenario);
  const queued = simulate(scenario, 'queue');
  const tired = simulate(scenario, 'tired');
  const lastQueued = queued.days.at(-1);
  const days = scenario.days;
  const tiredPerDay = tired.totals.escaped.total / days;

  return [
    '# Review capacity',
    '',
    '## Inputs',
    '',
    `- Parallel agents: ${scenario.agents}`,
    `- Pull requests per agent per day: ${formatNumber(scenario.prsPerAgent)}`,
    `- Lines changed per pull request: ${formatLines(scenario.linesPerPr)}`,
    `- Lines per effective sitting: ${formatLines(scenario.linesPerSitting)}`,
    `- Minutes per sitting: ${scenario.minutesPerSitting}`,
    `- Fresh sittings per day: ${scenario.sittings}`,
    `- Overflow policy: ${scenario.policy === 'queue' ? 'Queue it' : 'Review it tired'}`,
    `- Fatigued detection, relative to fresh (assumption): ${formatNumber(scenario.fatiguedFactor)}`,
    `- Defects per 1,000 changed lines (assumption): ${formatNumber(scenario.defectDensity)}`,
    `- Fresh detection rate (assumption): ${formatNumber(scenario.freshDetection)}%`,
    `- Share of pull requests needing human follow-up: ${formatNumber(scenario.followUpShare)}%`,
    `- Minutes of follow-up per touched pull request: ${scenario.followUpMinutes}`,
    `- Working days simulated: ${days}`,
    '',
    '## Each day',
    '',
    `- Generated: ${formatLines(balance.generated)} lines`,
    `- Capacity: ${formatLines(balance.capacity)} lines`,
    `- Gap: ${formatSignedLines(balance.gap)} lines`,
    `- Fresh review: ${formatMinutes(balance.reviewMinutes)} minutes`,
    `- Follow-up: ${formatMinutes(balance.followUpMinutes)} minutes`,
    `- Sustainable: ${sustainableText(balance.sustainableAgents)}`,
    '',
    `## After ${days} working ${plural(days, 'day')}`,
    '',
    `- Queue it: ${formatLines(lastQueued?.backlogLines ?? 0)} lines waiting in ${lastQueued?.backlogPrs ?? 0} ${plural(lastQueued?.backlogPrs ?? 0, 'pull request')}, oldest ${lastQueued ? oldestText(lastQueued) : 'nothing waiting'}`,
    `- Review it tired: ${formatDefects(tiredPerDay)} escaped defects a day (${formatDefects(tired.totals.escaped.fresh)} from fresh review and ${formatDefects(tired.totals.escaped.fatigued)} from tired review over ${days} ${plural(days, 'day')})`,
    `- If every line were reviewed fresh: ${formatDefects(allFreshEscapedPerDay(scenario))} escaped defects a day`,
    '',
  ].join('\n');
};

/** Every simulated day under both policies, as CSV. */
export const projectionToCsv = (scenario: Scenario): string => {
  const queued = simulate(scenario, 'queue');
  const tired = simulate(scenario, 'tired');
  const header = [
    'Day',
    'Generated lines',
    'Queue: lines waiting',
    'Queue: pull requests waiting',
    'Queue: oldest opened on day',
    'Tired: lines reviewed tired',
    'Tired: escaped defects from fresh review (cumulative)',
    'Tired: escaped defects from tired review (cumulative)',
  ].join(',');

  const rows = queued.days.map((day, index) => {
    const tiredDay = tired.days[index];

    return [
      day.day,
      day.generatedLines,
      day.backlogLines,
      day.backlogPrs,
      day.oldestOpenedDay ?? '',
      tiredDay.tiredLines,
      tiredDay.cumulativeEscaped.fresh.toFixed(4),
      tiredDay.cumulativeEscaped.fatigued.toFixed(4),
    ].join(',');
  });

  return `${[header, ...rows].join('\n')}\n`;
};
