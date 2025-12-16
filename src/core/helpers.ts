import * as fs from 'fs';
import * as path from 'path';

/**
 * Pluralize entity name (simple English rules)
 * Converts singular entity names to plural form
 */
export function pluralize(name: string): string {
    if (name.endsWith('y'))
        return name.slice(0, -1) + 'ies';

    if (name.endsWith('s'))
        return name + 'es';

    return name + 's';
}

/**
 * Write file only if it does NOT exist
 * Non-destructive file creation
 */
export function writeIfMissing(filePath: string, content: string): void {
    if (fs.existsSync(filePath))
        return;

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, { encoding: 'utf8' });
}

/**
 * Ensure file content by creating it if missing, or transforming if exists and different
 * Guarantees file content: creates file if missing.
 * If file exists and content differs, transforms it using the transformer function.
 */
export function ensureFileContent(
    filePath: string,
    initialContent: string,
    transformer?: (currentContent: string) => string
): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, initialContent, { encoding: 'utf8' });
        return;
    }

    if (transformer) {
        const currentContent = fs.readFileSync(filePath, { encoding: 'utf8' });
        const newContent = transformer(currentContent);
        if (newContent !== currentContent) {
            fs.writeFileSync(filePath, newContent, { encoding: 'utf8' });
        }
    }
}

/**
 * Get project relative path
 * Returns relative path of a file relative to the project root
 */
export function getProjectRelativePath(rootPath: string, fullPath: string): string {
    return path.relative(rootPath, fullPath).replace(/\\/g, '/');
}