import { describe, expect, it } from 'vitest';

import {
  createHomeSchedule,
  HomeViewport,
  type HomeRevealItem,
} from '@/components/home/lib/home-schedule';

function item(
  id: number,
  group: string,
  overrides: Partial<HomeRevealItem> = {}
): HomeRevealItem {
  return { id, group, sequence: 'stack', kind: 'text', ...overrides };
}

describe('home reveal choreography', () => {
  it('starts Projects after every profile unit has started, with a larger section gap', () => {
    const plan = createHomeSchedule().plan(
      [
        ...Array.from({ length: 4 }, (_, id) => item(id, 'profile')),
        ...Array.from({ length: 4 }, (_, id) => item(id + 4, 'projects')),
      ],
      { now: 0, viewport: HomeViewport.Wide }
    );
    expect(plan.map(step => step.startAt)).toEqual([
      0, 36, 72, 108, 228, 264, 300, 336,
    ]);
  });

  it('leads with the selected visible list item without changing DOM order', () => {
    const items = [
      item(0, 'craft', { sequence: 'list', kind: 'heading' }),
      item(1, 'craft', { sequence: 'list', kind: 'note' }),
      item(2, 'craft', { sequence: 'list', kind: 'craft' }),
      item(3, 'craft', { sequence: 'list', kind: 'craft', selected: true }),
      item(4, 'craft', { sequence: 'list', kind: 'craft' }),
    ];
    const plan = createHomeSchedule().plan(items, {
      now: 0,
      viewport: HomeViewport.Wide,
    });
    expect(plan.map(step => step.id)).toEqual([0, 1, 2, 3, 4]);
    expect(plan.map(step => step.startAt)).toEqual([0, 216, 96, 36, 156]);
  });

  it('starts a note 60ms after its final body unit, then leaves a section gap', () => {
    const plan = createHomeSchedule().plan(
      [
        item(0, 'projects'),
        item(1, 'projects', { kind: 'note' }),
        item(2, 'projects'),
        item(3, 'craft'),
      ],
      { now: 0, viewport: HomeViewport.Wide }
    );
    expect(plan.map(step => step.startAt)).toEqual([0, 96, 36, 216]);
  });

  it('preserves each 60ms note gap while compressing a tall first viewport', () => {
    const plan = createHomeSchedule().plan(
      ['projects', 'craft', 'writing'].flatMap((group, index) => [
        ...Array.from({ length: 8 }, (_, id) => item(index * 9 + id, group)),
        item(index * 9 + 8, group, { kind: 'note' }),
      ]),
      { now: 0, viewport: HomeViewport.Wide }
    );
    expect(Math.max(...plan.map(step => step.startAt))).toBeCloseTo(600);
    for (const index of [8, 17, 26]) {
      expect(plan[index].startAt - plan[index - 1].startAt).toBeCloseTo(60);
    }
  });

  it('does not wait for body content outside the initial viewport', () => {
    const plan = createHomeSchedule().plan(
      [item(0, 'projects', { kind: 'note' })],
      { now: 0, viewport: HomeViewport.Wide }
    );
    expect(plan[0].startAt).toBe(0);
  });

  it('caps a 200-item list without extending the delay for each later item', () => {
    const plan = createHomeSchedule().plan(
      [
        item(0, 'writing', { sequence: 'list', kind: 'heading' }),
        ...Array.from({ length: 200 }, (_, id) =>
          item(id + 1, 'writing', { sequence: 'list', kind: 'writing' })
        ),
      ],
      { now: 0, viewport: HomeViewport.Wide }
    );
    expect(plan.slice(0, 6).map(step => step.startAt)).toEqual([
      0, 36, 96, 156, 216, 216,
    ]);
    expect(plan.at(-1)?.startAt).toBe(216);
    expect(plan.filter(step => step.blur > 0)).toHaveLength(12);
  });

  it('compresses a tall viewport proportionally while keeping the section rhythm', () => {
    const plan = createHomeSchedule().plan(
      Array.from({ length: 20 }, (_, id) => item(id, `section-${id}`)),
      { now: 0, viewport: HomeViewport.Wide }
    );
    expect(plan.at(-1)?.startAt).toBe(600);
    expect(plan[1].startAt / plan[2].startAt).toBeCloseTo(0.5);
  });

  it('uses less blur on narrow screens and none on the large preview', () => {
    const plan = createHomeSchedule().plan(
      [
        item(0, 'profile'),
        item(1, 'projects', { kind: 'preview' }),
        item(2, 'craft', { kind: 'craft' }),
        item(3, 'writing', { kind: 'writing' }),
        item(4, 'writing', { kind: 'note' }),
      ],
      { now: 0, viewport: HomeViewport.Compact }
    );
    expect(plan.map(step => step.blur)).toEqual([6, 0, 3, 4, 2]);
    expect(plan[1].distance).toBe(4);
    expect(plan.at(-1)?.distance).toBe(0);
  });

  it('reserves pending blur across cohorts and releases each slot only once', () => {
    const schedule = createHomeSchedule();
    schedule.plan(
      Array.from({ length: 12 }, (_, id) => item(id, 'profile')),
      { now: 0, viewport: HomeViewport.Wide }
    );
    const first = schedule.plan([item(12, 'writing')], {
      now: 1000,
      viewport: HomeViewport.Wide,
    });
    expect(first[0].blur).toBe(0);
    schedule.release(0);
    schedule.release(0);
    const next = schedule.plan([item(13, 'writing'), item(14, 'writing')], {
      now: 1100,
      viewport: HomeViewport.Wide,
    });
    expect(next.map(step => step.blur)).toEqual([10, 0]);
    expect(next.map(step => step.startAt)).toEqual([1100, 1136]);
  });

  it('keeps list counts and stagger history after release', () => {
    const schedule = createHomeSchedule();
    const entries = (ids: number[]) =>
      ids.map(id => item(id, 'writing', { kind: 'writing', sequence: 'list' }));
    schedule.plan(entries([0, 1]), { now: 0, viewport: HomeViewport.Wide });
    schedule.release(0);
    schedule.release(1);
    expect(
      schedule
        .plan(entries([2, 3, 4]), { now: 1000, viewport: HomeViewport.Wide })
        .map(step => step.startAt)
    ).toEqual([1000, 1060, 1060]);
    expect(
      schedule
        .plan(entries([5, 6, 7]), { now: 2000, viewport: HomeViewport.Wide })
        .map(step => step.startAt)
    ).toEqual([2000, 2000, 2000]);
  });

  it('joins split heading, entries and note observations using absolute time', () => {
    const schedule = createHomeSchedule();
    const entry = (id: number, kind: HomeRevealItem['kind']) =>
      item(id, 'writing', { kind, sequence: 'list' });
    schedule.plan([entry(20, 'heading')], {
      now: 500,
      viewport: HomeViewport.Wide,
    });
    expect(
      schedule
        .plan([entry(21, 'writing'), entry(22, 'writing')], {
          now: 516,
          viewport: HomeViewport.Wide,
        })
        .map(step => step.startAt - 516)
    ).toEqual([20, 80]);
    expect(
      schedule
        .plan([entry(23, 'writing'), entry(24, 'note')], {
          now: 532,
          viewport: HomeViewport.Wide,
        })
        .map(step => step.startAt - 532)
    ).toEqual([124, 184]);
  });

  it('preserves section history after all blur slots have been returned', () => {
    const schedule = createHomeSchedule();
    const items = Array.from({ length: 4 }, (_, id) => item(id, 'profile'));
    schedule.plan(items, { now: 0, viewport: HomeViewport.Wide });
    items.forEach(item => schedule.release(item.id));
    expect(
      schedule.plan([item(4, 'writing')], {
        now: 50,
        viewport: HomeViewport.Wide,
      })[0].startAt
    ).toBe(228);
  });
});
