/**
 * Enterprise Safe Array Utilities & Defensive Accessors
 * Prevents runtime "TypeError: X.map / X.filter is not a function" crashes.
 */

export function safeArray<T = any>(val: unknown): T[] {
    if (Array.isArray(val)) return val
    if (!val) return []
    if (typeof val === "object" && val !== null) {
        if ("data" in val && Array.isArray((val as any).data)) {
            return (val as any).data
        }
    }
    return []
}

export function safeMap<T = any, R = any>(
    val: unknown,
    fn: (item: T, index: number, array: T[]) => R
): R[] {
    return safeArray<T>(val).map(fn)
}

export function safeFilter<T = any>(
    val: unknown,
    fn: (item: T, index: number, array: T[]) => boolean
): T[] {
    return safeArray<T>(val).filter(fn)
}

export function safeFind<T = any>(
    val: unknown,
    fn: (item: T, index: number, array: T[]) => boolean
): T | undefined {
    return safeArray<T>(val).find(fn)
}
