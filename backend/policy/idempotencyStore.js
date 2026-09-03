const processedKeys = new Set();

export function hasProcessed(key) {
  return processedKeys.has(key);
}

export function markProcessed(key) {
  processedKeys.add(key);
}

export function getProcessedKeyCount() {
  return processedKeys.size;
}