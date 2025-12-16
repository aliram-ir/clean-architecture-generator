import * as fs from 'fs';
import * as path from 'path';
import { detectLayers, DetectedLayers } from './layerDetector';

/**
 * Project Context
 * کانتکست سراسری پروژه
 */
export interface ProjectContext {
    rootPath: string;
    solutionName: string;
    mode: 'solution' | 'project';
    layers: DetectedLayers;
}

/**
 * Universal Project Resolver
 * تشخیص Solution یا Project و لایه‌های Clean Architecture
 */
export function resolveProjectContext(
    startFile: string
): ProjectContext | null {

    const startDir = path.dirname(startFile);

    // 🔍 Search for Solution (.sln)
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

    // 🔁 Fallback: single csproj mode
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

/**
 * Utility: find directory upwards
 * جستجوی پوشه‌ها به سمت بالا
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
