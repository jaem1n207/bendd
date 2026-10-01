export const DOCK_MIN_SIZE = 32;
export const DOCK_MAX_SIZE = 64;
export const DOCK_DEFAULT_SIZE = 40;
export const DOCK_MIN_MAGNIFICATION = 1;
export const DOCK_MAX_MAGNIFICATION = 2;
export const DOCK_DEFAULT_MAGNIFICATION = 1.6;
export const DOCK_EDGE_SPACE = 16;
export enum DockSetting {
  Size = 'size',
  Magnification = 'magnification',
}
export enum DockInteraction {
  Idle,
  Settings,
  Preview,
}
export const DOCK_RESIZE_SENSITIVITY = 0.5;
export const DOCK_SPRING_FREQUENCY = 26;
export const DOCK_REST_THRESHOLD = 0.01;

export enum DockInput {
  Pointer = 'pointer',
  Keyboard = 'keyboard',
  Static = 'static',
}

export enum DockMotionMode {
  Animated = 'animated',
  Static = 'static',
}

export const DOCK_STORAGE_KEY = 'dock-preferences';
export const DOCK_INITIAL_SIZE_PROPERTY = '--site-dock-size';
