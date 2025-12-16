import * as fs from 'fs';
import * as path from 'path';

/*
|--------------------------------------------------------------------------
| Project Scanner
|--------------------------------------------------------------------------
*/

export interface ScannedProjects {
    application?: string;
    infrastructure?: string;
    api?: string;
}

export function scanProjects(root: string, solution: string): ScannedProjects {

    const result: ScannedProjects = {};

    const dirs = fs.readdirSync(root)
        .map(d => path.join(root, d))
        .filter(d => fs.statSync(d).isDirectory());

    for (const dir of dirs) {
        const csproj = fs.readdirSync(dir).find(f => f.endsWith('.csproj'));
        if (!csproj) continue;

        if (dir.endsWith('.Application')) result.application = dir;
        else if (dir.endsWith('.Infrastructure')) result.infrastructure = dir;
        else if (dir.endsWith('.API') || dir.endsWith('.Web') || dir.endsWith('.WebApi'))
            result.api = dir;
    }

    return result;
}
