import type { StateStorage } from 'zustand/middleware';

// 저장소가 차단돼도 현재 탭의 Dock 상태는 유지한다.
export const dockStorage: StateStorage = {
  getItem: name => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      return;
    }
  },
  removeItem: name => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      return;
    }
  },
};
