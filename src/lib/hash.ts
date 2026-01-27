/**
 * Simple deterministic hash function for fingerprinting fills.
 * Uses a variant of djb2 hash algorithm.
 * Zero dependencies.
 */
export function hashString(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) + hash) ^ char; // hash * 33 ^ char
    }
    // Convert to hex string, always positive
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
  
  /**
   * Generate a deterministic fingerprint for a fill.
   * Used for deduplication across imports.
   * Format: symbol|side|qty|price|timestamp
   */
  export function generateFillFingerprint(
    symbol: string,
    side: string,
    quantity: number,
    price: number,
    filledTime: Date
  ): string {
    // Normalize the values for consistent hashing
    const normalized = [
      symbol.toUpperCase().trim(),
      side.toUpperCase().trim(),
      quantity.toFixed(6),
      price.toFixed(6),
      filledTime.toISOString(),
    ].join('|');
    
    return hashString(normalized);
  }
  
  /**
   * Generate a unique ID for a fill based on its fingerprint
   */
  export function generateFillId(fingerprint: string): string {
    return `fill_${fingerprint}`;
  }