import Image from 'next/image';

import { techStackGroups } from '@/components/home/consts/tech-stack';
import styles from '@/components/home/ui/tech-stack.module.css';

export function TechStack() {
  return (
    <div className={styles.groups}>
      {techStackGroups.map(group => (
        <section
          key={group.id}
          className={styles.group}
          aria-labelledby={`tech-stack-${group.id}`}
          data-reveal
        >
          <div className={styles.heading}>
            <h3 id={`tech-stack-${group.id}`}>{group.name}</h3>
            <p>{group.description}</p>
          </div>
          <ul className={styles.items}>
            {group.items.map(item => (
              <li key={item.id} className={styles.item}>
                <span
                  className={styles.icon}
                  data-monochrome={item.monochrome || undefined}
                  data-dark-contrast={item.darkContrast || undefined}
                  aria-hidden="true"
                >
                  <Image
                    className={styles.monochrome}
                    src={`/images/tech-stack/${item.image ?? `${item.id}.svg`}`}
                    alt=""
                    width={24}
                    height={24}
                    draggable={false}
                  />
                  <Image
                    className={styles.color}
                    src={`/images/tech-stack/${item.image ?? `${item.id}.svg`}`}
                    alt=""
                    width={24}
                    height={24}
                    draggable={false}
                  />
                </span>
                <span>{item.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
