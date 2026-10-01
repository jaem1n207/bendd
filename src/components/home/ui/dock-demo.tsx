'use client';

import { BookOpen, Folder, Image, Music2, Terminal } from 'lucide-react';
import { useState } from 'react';

import styles from '@/components/home/ui/home-studio.module.css';
import { DockControls, DockItem, DockSurface } from '@/components/navigation';

const DEMO_SIZE = 40;
const DEMO_MAGNIFICATION = 80;
const apps = [
  { name: 'Files', icon: Folder },
  { name: 'Photos', icon: Image },
  { name: 'Music', icon: Music2 },
  { name: 'Notes', icon: BookOpen },
  { name: 'Terminal', icon: Terminal },
];

export function DockDemo() {
  const [size, setSize] = useState(DEMO_SIZE);
  const [magnification, setMagnification] = useState(DEMO_MAGNIFICATION);
  const [selected, setSelected] = useState('Files');
  return (
    <div className={styles.dockDemo}>
      <div className={styles.dockStage} data-dock-boundary="">
        <span className={styles.stageLabel}>DOCK / MAGNIFICATION</span>
        <DockSurface
          size={size}
          magnification={magnification}
          label="Craft Dock 데모"
        >
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
      <div className={styles.dockDemoControls}>
        <DockControls
          size={size}
          magnification={magnification}
          onSizeChange={setSize}
          onMagnificationChange={setMagnification}
          labelPrefix="데모 "
        />
        <p>이 데모의 크기만 바뀝니다.</p>
      </div>
    </div>
  );
}
