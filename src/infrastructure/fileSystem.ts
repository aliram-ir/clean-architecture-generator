import * as fs from 'fs';
import * as path from 'path';

/*
|--------------------------------------------------------------------------
| File System Helpers
|--------------------------------------------------------------------------
*/

export function writeIfMissing(file: string, content: string) {

    if (fs.existsSync(file)) return;

    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
}

export function findUp(
    start: string,
    predicate: (dir: string) => boolean
): string | null {

    let dir = start;

    while (true) {
        if (predicate(dir)) return dir;

        const parent = path.dirname(dir);
        if (parent === dir) return null;

        dir = parent;
    }
}
