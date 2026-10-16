export function canUseGiscusStorage() {
  try {
    const storage = window.localStorage;
    const probeKey = `giscus-storage-${crypto.randomUUID()}`;

    try {
      storage.setItem(probeKey, probeKey);
      return storage.getItem(probeKey) === probeKey;
    } finally {
      storage.removeItem(probeKey);
    }
  } catch {
    return false;
  }
}
