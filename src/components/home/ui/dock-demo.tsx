'use client';

import { BookOpen, Folder, Image, Music2, Terminal } from 'lucide-react';
import { useState } from 'react';

import styles from '@/components/home/ui/home-studio.module.css';
import { DockItem, DockSurface } from '@/components/navigation';

const DEMO_SIZE = 40;
const apps = [
  { name: 'Files', icon: Folder },
  { name: 'Photos', icon: Image },
  { name: 'Music', icon: Music2 },
  { name: 'Notes', icon: BookOpen },
  { name: 'Terminal', icon: Terminal },
];

export function DockDemo() {
  const [size, setSize] = useState(DEMO_SIZE);
  const [selected, setSelected] = useState('Files');
  return (
    <div className={styles.dockDemo}>
      <div className={styles.dockStage} data-dock-boundary="">
        <span className={styles.stageLabel}>DOCK / DRAG TO RESIZE</span>
        <DockSurface size={size} onSizeChange={setSize} label="Craft Dock 데모">
          {apps.map(({ name, icon: Icon }) => (
            <DockItem key={name} name={name}>
              <button
                type="button"
                aria-label={`${name} 데모`}
                aria-pressed={selected === name}
                className={styles.dockDemoButton}
                onClick={() => setSelected(name)}
              >
                <Icon aria-hidden="true" strokeWidth={1.6} />
                <span className={styles.dockDemoDot} aria-hidden="true" />
              </button>
            </DockItem>
          ))}
        </DockSurface>
      </div>
      <div className={styles.dockDemoHint}>
        <p>Resize Dock을 누른 채 위아래로 끌어 크기를 조절해 보세요.</p>
        <span>
          이 데모만 변경 · <output>{Number(size.toFixed(1))}px</output>
        </span>
      </div>
    </div>
  );
}
