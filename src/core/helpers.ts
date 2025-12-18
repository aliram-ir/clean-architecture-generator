import * as fs from 'fs';
import * as path from 'path';

/**
 * toPascalCase
 * user_profile -> UserProfile
 */
export function toPascalCase(value: string): string {
    return value
        .replace(/[-_]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('');
}

/**
 * toCamelCase
 * user_profile -> userProfile
 */
export function toCamelCase(value: string): string {
    const pascal = toPascalCase(value);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * pluralize (Simple English rules – deterministic)
 */
export function pluralize(name: string): string {
    if (name.endsWith('y')) {
        return name.slice(0, -1) + 'ies';
    }

    if (name.endsWith('s')) {
        return name + 'es';
    }

    return name + 's';
}

/*
|--------------------------------------------------------------------------
| File System Utilities (Idempotent)
|--------------------------------------------------------------------------
*/

/**
 * Write file only if it does not exist
 */
export function writeIfMissing(filePath: string, content: string): void {
    if (fs.existsSync(filePath)) return;

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, { encoding: 'utf8' });
}

/**
 * Ensure file exists, optionally mutate content
 */
export function ensureFile(
    filePath: string,
    initialContent: string,
    transformer?: (current: string) => string
): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, initialContent, 'utf8');
        return;
    }

    if (!transformer) return;

    const current = fs.readFileSync(filePath, 'utf8');
    const updated = transformer(current);

    if (updated !== current) {
        fs.writeFileSync(filePath, updated, 'utf8');
    }
}

/**
 * Normalize path for C# using
 */
export function normalizeNamespacePath(p: string): string {
    return p.replace(/\\/g, '.').replace(/\//g, '.');
}
