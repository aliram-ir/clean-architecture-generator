import * as fs from 'fs';
import * as path from 'path';
import { detectLayers, DetectedLayers } from './layerDetector';

/**
 * Project Context
 */
export interface ProjectContext {
    rootPath: string;
    solutionName: string;
    mode: 'solution' | 'project';
    layers: DetectedLayers;
}

/**
 * Universal Project Resolver
 */
export function resolveProjectContext(
    startFile: string
): ProjectContext | null {

    const startDir = path.dirname(startFile);

    // 🔍 Find solution
    const slnRoot = findUp(startDir, d =>
        fs.readdirSync(d).some(f => f.endsWith('.sln'))
    );

    if (slnRoot) {
        const sln = fs.readdirSync(slnRoot).find(f => f.endsWith('.sln'))!;
        const solutionName = path.basename(sln, '.sln');

        return {
            rootPath: slnRoot,
            solutionName,
            mode: 'solution',
            layers: detectLayers(slnRoot, solutionName)
        };
    }

    // 🔁 Fallback to nearest csproj
    const csprojRoot = findUp(startDir, d =>
        fs.readdirSync(d).some(f => f.endsWith('.csproj'))
    );

    if (csprojRoot) {
        const csproj = fs.readdirSync(csprojRoot).find(f => f.endsWith('.csproj'))!;
        const projectName = path.basename(csproj, '.csproj');

        return {
            rootPath: csprojRoot,
            solutionName: projectName,
            mode: 'project',
            layers: detectLayers(csprojRoot, projectName)
        };
    }

    return null;
}

/**
 * Utility: find directory upwards
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
