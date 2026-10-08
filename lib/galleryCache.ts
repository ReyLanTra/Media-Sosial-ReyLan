// In-memory LRU Cache for loaded gallery assets
class GalleryLRUCache {
  private cache: Map<string, number>;
  private maxItems: number;

  constructor(maxItems = 50) {
    this.cache = new Map();
    this.maxItems = maxItems;
  }

  has(url: string): boolean {
    if (!url) return false;
    if (this.cache.has(url)) {
      // Refresh recency
      this.cache.delete(url);
      this.cache.set(url, Date.now());
      return true;
    }
    return false;
  }

  set(url: string): void {
    if (!url) return;
    if (this.cache.has(url)) {
      this.cache.delete(url);
    } else if (this.cache.size >= this.maxItems) {
      // Evict oldest item
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(url, Date.now());
  }

  delete(url: string): void {
    this.cache.delete(url);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global in-memory instance for gallery viewport caching
export const galleryMemoryCache = new GalleryLRUCache(50);
