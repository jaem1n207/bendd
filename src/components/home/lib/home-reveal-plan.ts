export type HomeRevealKind =
  | 'text'
  | 'heading'
  | 'preview'
  | 'craft'
  | 'writing'
  | 'note';

export interface HomeRevealItem {
  id: number;
  group: string;
  sequence: 'stack' | 'list';
  kind: HomeRevealKind;
  selected?: boolean;
}

export const HOME_NOTE_DELAY = 60;

export enum HomeViewport {
  Compact = 'compact',
  Wide = 'wide',
}

interface HomeRevealPlanOptions {
  blurBudget?: number;
  listEntries?: ReadonlyMap<string, number>;
}

/** Plan a newly visible cohort in DOM order, without changing earlier effects. */
export function createHomeRevealPlan(
  items: HomeRevealItem[],
  viewport: HomeViewport,
  options: HomeRevealPlanOptions = {}
) {
  const compact = viewport === HomeViewport.Compact;
  const groups = new Map<string, HomeRevealItem[]>();
  const delays = new Map<number, number>();
  const fixedDelays = new Map<number, number>();
  const leaders = new Set<number>();
  for (const item of items) {
    const group = groups.get(item.group) ?? [];
    group.push(item);
    groups.set(item.group, group);
  }

  let start = 0;
  let noteDelay = 0;
  for (const group of groups.values()) {
    const content = group.filter(item => item.kind !== 'note');
    const notes = group.filter(item => item.kind === 'note');
    content.forEach(item => fixedDelays.set(item.id, noteDelay));
    if (group[0].sequence === 'list') {
      const heading = content.filter(item => item.kind === 'heading');
      const entries = content.filter(item => item.kind !== 'heading');
      const first = entries.find(item => item.selected) ?? entries[0];
      heading.forEach(item => delays.set(item.id, start));
      if (first) {
        leaders.add(first.id);
        const seen = options.listEntries?.get(group[0].group) ?? 0;
        const ordered = [first, ...entries.filter(item => item !== first)];
        ordered.forEach((item, index) =>
          delays.set(
            item.id,
            start +
              (heading.length ? 36 : 0) +
              (Math.min(seen + index, 3) - Math.min(seen, 3)) * 60
          )
        );
      }
    } else {
      content.forEach((item, index) => delays.set(item.id, start + index * 36));
    }
    const last = Math.max(
      start,
      ...content.map(item => delays.get(item.id) ?? start)
    );
    const pause = notes.length && content.length ? HOME_NOTE_DELAY : 0;
    noteDelay += pause;
    notes.forEach(item => {
      delays.set(item.id, last + pause);
      fixedDelays.set(item.id, noteDelay);
    });
    start = last + pause + 120;
  }

  const lastStart = Math.max(0, ...delays.values());
  // Reserve each note's 60ms pause before compressing the remaining intervals.
  // The home has three annotated groups; their pauses fit inside the 600ms cap.
  const scalableDelay = lastStart - noteDelay;
  const scale =
    lastStart > 600 && scalableDelay > 0
      ? Math.max(0, 600 - noteDelay) / scalableDelay
      : 1;
  // Important text and each list's leading item retain blur when a tall viewport
  // exceeds the layer budget. The remainder keep the same opacity timing.
  const priority = (item: HomeRevealItem) =>
    item.kind === 'text' || item.kind === 'heading' || leaders.has(item.id)
      ? 0
      : 1;
  const blurred = new Set(
    items
      .filter(item => item.kind !== 'preview')
      .sort((a, b) => priority(a) - priority(b))
      .slice(0, Math.max(0, Math.min(12, options.blurBudget ?? 12)))
      .map(item => item.id)
  );
  return items.map(item => {
    let blur = compact ? 6 : 10;
    let distance = 8;
    if (item.kind === 'preview') {
      blur = 0;
      distance = 4;
    }
    if (item.kind === 'craft') {
      blur = compact ? 3 : 6;
      distance = 6;
    }
    if (item.kind === 'writing') {
      blur = compact ? 4 : 8;
      distance = 6;
    }
    if (item.kind === 'note') {
      blur = compact ? 2 : 4;
      distance = 0;
    }
    return {
      id: item.id,
      delay:
        ((delays.get(item.id) ?? 0) - (fixedDelays.get(item.id) ?? 0)) * scale +
        (fixedDelays.get(item.id) ?? 0),
      blur: blurred.has(item.id) ? blur : 0,
      distance,
    };
  });
}
