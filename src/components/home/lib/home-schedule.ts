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

const HOME_NOTE_DELAY = 60;
const STACK_GAP = 36;
const LIST_GAP = 60;
const SECTION_GAP = 120;
const LIST_STAGGER_COUNT = 4;
const MAX_DELAY = 600;
const BLUR_BUDGET = 12;

export enum HomeViewport {
  Compact = 'compact',
  Wide = 'wide',
}

interface HomeRevealPlanOptions {
  blurBudget?: number;
  listEntries?: ReadonlyMap<string, number>;
}

/** Plan a newly visible cohort in DOM order, without changing earlier effects. */
function createHomeRevealPlan(
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
              (heading.length ? STACK_GAP : 0) +
              (Math.min(seen + index, LIST_STAGGER_COUNT - 1) -
                Math.min(seen, LIST_STAGGER_COUNT - 1)) *
                LIST_GAP
          )
        );
      }
    } else {
      content.forEach((item, index) =>
        delays.set(item.id, start + index * STACK_GAP)
      );
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
    start = last + pause + SECTION_GAP;
  }

  const lastStart = Math.max(0, ...delays.values());
  // Reserve each note's 60ms pause before compressing the remaining intervals.
  // The home has three annotated groups; their pauses fit inside the 600ms cap.
  const scalableDelay = lastStart - noteDelay;
  const scale =
    lastStart > MAX_DELAY && scalableDelay > 0
      ? Math.max(0, MAX_DELAY - noteDelay) / scalableDelay
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
      .slice(
        0,
        Math.max(0, Math.min(BLUR_BUDGET, options.blurBudget ?? BLUR_BUDGET))
      )
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

interface GroupSchedule {
  bodyStart?: number;
  bodyKind?: HomeRevealKind;
  entries: number;
}

/** One effect owns one schedule. Time and DOM-ordered descriptors are explicit inputs. */
export function createHomeSchedule() {
  const groups = new Map<string, GroupSchedule>();
  const blurred = new Set<number>();
  let latest: { group: string; at: number } | undefined;

  function plan(
    items: HomeRevealItem[],
    { now, viewport }: { now: number; viewport: HomeViewport }
  ) {
    const firstGroup = items[0]?.group;
    if (!firstGroup) {
      return [];
    }
    const firstItems = items.filter(item => item.group === firstGroup);
    const first =
      firstItems.find(item => item.kind !== 'note') ?? firstItems[0];
    let epoch = now;
    if (latest?.group !== firstGroup) {
      if (latest) {
        epoch = Math.max(epoch, latest.at + SECTION_GAP);
      }
    } else {
      const previous = groups.get(firstGroup);
      if (previous?.bodyStart !== undefined) {
        const gap =
          first.kind === 'note'
            ? HOME_NOTE_DELAY
            : first.sequence === 'stack' || previous.bodyKind === 'heading'
              ? STACK_GAP
              : previous.entries >= LIST_STAGGER_COUNT
                ? 0
                : LIST_GAP;
        epoch = Math.max(epoch, previous.bodyStart + gap);
      }
    }
    const cohort = createHomeRevealPlan(items, viewport, {
      blurBudget: BLUR_BUDGET - blurred.size,
      listEntries: new Map(
        Array.from(groups, ([group, state]) => [group, state.entries])
      ),
    });
    const byId = new Map(items.map(item => [item.id, item]));
    return cohort.map(step => {
      const item = byId.get(step.id)!;
      const startAt = epoch + step.delay;
      const state = groups.get(item.group) ?? { entries: 0 };
      if (item.kind !== 'note') {
        if (state.bodyStart === undefined || startAt >= state.bodyStart) {
          state.bodyStart = startAt;
          state.bodyKind = item.kind;
        }
        if (item.kind !== 'heading') {
          state.entries += 1;
        }
      }
      groups.set(item.group, state);
      if (!latest || startAt >= latest.at) {
        latest = { group: item.group, at: startAt };
      }
      if (step.blur > 0) {
        blurred.add(step.id);
      }
      return { id: step.id, startAt, blur: step.blur, distance: step.distance };
    });
  }

  return {
    plan,
    release: (id: number) => {
      blurred.delete(id);
    },
  };
}
