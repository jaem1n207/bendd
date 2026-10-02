'use client';

import { BookOpen, Folder, Image, Music2, Terminal } from 'lucide-react';
import { Fragment, useState } from 'react';

import styles from '@/components/home/ui/home-studio.module.css';
import {
  DOCK_DEFAULT_SIZE,
  DOCK_DEFAULT_MAGNIFICATION,
  DockItem,
  DockSeparator,
  DockSurface,
} from '@/components/navigation';

const apps = [
  { name: 'Files', icon: Folder },
  { name: 'Photos', icon: Image },
  { name: 'Music', icon: Music2 },
  { name: 'Notes', icon: BookOpen },
  { name: 'Terminal', icon: Terminal },
];

export function DockDemo() {
  const [size, setSize] = useState(DOCK_DEFAULT_SIZE);
  const [magnification, setMagnification] = useState(
    DOCK_DEFAULT_MAGNIFICATION
  );
  const [selected, setSelected] = useState('Files');
  return (
    <div className={styles.dockDemo}>
      <div className={styles.dockStage} data-dock-boundary="">
        <span className={styles.stageLabel}>DOCK / HOVER & RESIZE</span>
        <DockSurface
          size={size}
          onSizeChange={setSize}
          magnification={magnification}
          onMagnificationChange={setMagnification}
          label="Craft Dock 데모"
        >
          {apps.map(({ name, icon: Icon }) => (
            <Fragment key={name}>
              {name === 'Terminal' && <DockSeparator />}
              <DockItem name={name}>
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
            </Fragment>
          ))}
        </DockSurface>
      </div>
      <div className={styles.dockDemoHint}>
        <p>구분선을 위아래로 끌어 크기 조절 · 우클릭으로 세부 설정</p>
        <span>
          이 데모만 변경 · <output>{Number(size.toFixed(1))}px</output>
        </span>
      </div>
    </div>
  );
}
