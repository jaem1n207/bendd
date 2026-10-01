import { describe, expect, it } from 'vitest';

import {
  createHomeRevealPlan,
  HomeViewport,
  type HomeRevealItem,
} from '@/components/home/lib/home-reveal-plan';

function item(
  id: number,
  group: string,
  overrides: Partial<HomeRevealItem> = {}
): HomeRevealItem {
  return { id, group, sequence: 'stack', kind: 'text', ...overrides };
}

describe('home reveal choreography', () => {
  it('starts Projects after every profile unit has started, with a larger section gap', () => {
    const plan = createHomeRevealPlan(
      [
        ...Array.from({ length: 4 }, (_, id) => item(id, 'profile')),
        ...Array.from({ length: 4 }, (_, id) => item(id + 4, 'projects')),
      ],
      HomeViewport.Wide
    );
    expect(plan.map(step => step.delay)).toEqual([
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
    const plan = createHomeRevealPlan(items, HomeViewport.Wide);
    expect(plan.map(step => step.id)).toEqual([0, 1, 2, 3, 4]);
    expect(plan.map(step => step.delay)).toEqual([0, 216, 96, 36, 156]);
  });

  it('starts a note 60ms after its final body unit, then leaves a section gap', () => {
    const plan = createHomeRevealPlan(
      [
        item(0, 'projects'),
        item(1, 'projects', { kind: 'note' }),
        item(2, 'projects'),
        item(3, 'craft'),
      ],
      HomeViewport.Wide
    );
    expect(plan.map(step => step.delay)).toEqual([0, 96, 36, 216]);
  });

  it('preserves each 60ms note gap while compressing a tall first viewport', () => {
    const plan = createHomeRevealPlan(
      ['projects', 'craft', 'writing'].flatMap((group, index) => [
        ...Array.from({ length: 8 }, (_, id) => item(index * 9 + id, group)),
        item(index * 9 + 8, group, { kind: 'note' }),
      ]),
      HomeViewport.Wide
    );
    expect(Math.max(...plan.map(step => step.delay))).toBeCloseTo(600);
    for (const index of [8, 17, 26]) {
      expect(plan[index].delay - plan[index - 1].delay).toBeCloseTo(60);
    }
  });

  it('does not wait for body content outside the initial viewport', () => {
    const plan = createHomeRevealPlan(
      [item(0, 'projects', { kind: 'note' })],
      HomeViewport.Wide
    );
    expect(plan[0].delay).toBe(0);
  });

  it('caps a 200-item list without extending the delay for each later item', () => {
    const plan = createHomeRevealPlan(
      [
        item(0, 'writing', { sequence: 'list', kind: 'heading' }),
        ...Array.from({ length: 200 }, (_, id) =>
          item(id + 1, 'writing', { sequence: 'list', kind: 'writing' })
        ),
      ],
      HomeViewport.Wide
    );
    expect(plan.slice(0, 6).map(step => step.delay)).toEqual([
      0, 36, 96, 156, 216, 216,
    ]);
    expect(plan.at(-1)?.delay).toBe(216);
    expect(plan.filter(step => step.blur > 0)).toHaveLength(12);
  });

  it('compresses a tall viewport proportionally while keeping the section rhythm', () => {
    const plan = createHomeRevealPlan(
      Array.from({ length: 20 }, (_, id) => item(id, `section-${id}`)),
      HomeViewport.Wide
    );
    expect(plan.at(-1)?.delay).toBe(600);
    expect(plan[1].delay / plan[2].delay).toBeCloseTo(0.5);
  });

  it('uses less blur on narrow screens and none on the large preview', () => {
    const plan = createHomeRevealPlan(
      [
        item(0, 'profile'),
        item(1, 'projects', { kind: 'preview' }),
        item(2, 'craft', { kind: 'craft' }),
        item(3, 'writing', { kind: 'writing' }),
        item(4, 'writing', { kind: 'note' }),
      ],
      HomeViewport.Compact
    );
    expect(plan.map(step => step.blur)).toEqual([6, 0, 3, 4, 2]);
    expect(plan[1].distance).toBe(4);
    expect(plan.at(-1)?.distance).toBe(0);
  });

  it('allocates only the blur slots left by earlier entrances', () => {
    const plan = createHomeRevealPlan(
      [
        item(0, 'writing', { kind: 'heading', sequence: 'list' }),
        item(1, 'writing', { kind: 'note', sequence: 'list' }),
        item(2, 'writing', { kind: 'writing', sequence: 'list' }),
      ],
      HomeViewport.Wide,
      { blurBudget: 1 }
    );
    expect(plan.map(step => step.blur)).toEqual([10, 0, 0]);
    expect(plan.map(step => step.delay)).toEqual([0, 96, 36]);
  });

  it('keeps the list stagger cap when entries arrive in later observations', () => {
    const items = [0, 1, 2].map(id =>
      item(id, 'writing', { kind: 'writing', sequence: 'list' })
    );
    const options = { listEntries: new Map([['writing', 2]]) };
    expect(
      createHomeRevealPlan(items, HomeViewport.Wide, options).map(
        step => step.delay
      )
    ).toEqual([0, 60, 60]);
    options.listEntries.set('writing', 4);
    expect(
      createHomeRevealPlan(items, HomeViewport.Wide, options).map(
        step => step.delay
      )
    ).toEqual([0, 0, 0]);
  });
});
