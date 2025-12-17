import * as fs from 'fs';
import * as path from 'path';

import { detectLayers } from './layerDetector';
import { ProjectContext } from './projectContext';

/*
|--------------------------------------------------------------------------
| Project Context Resolver
|--------------------------------------------------------------------------
| ✅ Factory only
| ✅ Returns canonical ProjectContext
*/

export function resolveProjectContext(
    startFile: string
): ProjectContext | null {

    const startDir = path.dirname(startFile);

    // 🔍 Find Solution (.sln)
    const slnRoot = findUp(startDir, dir =>
        fs.existsSync(dir) &&
        fs.readdirSync(dir).some(f => f.endsWith('.sln'))
    );

    if (slnRoot) {
        const slnFile = fs.readdirSync(slnRoot).find(f => f.endsWith('.sln'))!;
        const solutionName = path.basename(slnFile, '.sln');

        return {
            rootPath: slnRoot,
            solutionName,
            mode: 'solution',
            layers: detectLayers(slnRoot, solutionName)
        };
    }

    // 🔁 Fallback: single project mode
    const csprojRoot = findUp(startDir, dir =>
        fs.existsSync(dir) &&
        fs.readdirSync(dir).some(f => f.endsWith('.csproj'))
    );

    if (csprojRoot) {
        const csprojFile = fs.readdirSync(csprojRoot).find(f => f.endsWith('.csproj'))!;
        const projectName = path.basename(csprojFile, '.csproj');

        return {
            rootPath: csprojRoot,
            solutionName: projectName,
            mode: 'project',
            layers: detectLayers(csprojRoot, projectName)
        };
    }

    return null;
}

/*
|--------------------------------------------------------------------------
| Utility: find directory upwards
|--------------------------------------------------------------------------
*/

function findUp(
    start: string,
    predicate: (dir: string) => boolean
): string | null {

    let current = start;

    while (true) {
        if (predicate(current)) return current;

        const parent = path.dirname(current);
        if (parent === current) break;

        current = parent;
    }

    return null;
}
