import * as fs from 'fs';
import * as path from 'path';

export interface DetectedLayers {
    domain: string;
    application: string;
    infrastructure: string;
    shared?: string;
    di?: string;
    api?: string;
}

/*
|--------------------------------------------------------------------------
| Detect Layers
|--------------------------------------------------------------------------
| ✅ Flexible naming
| ✅ Solution / Project mode safe
| ✅ FS-only
| ✅ No side effects
*/

export function detectLayers(
    root: string,
    solution: string
): DetectedLayers {

    const candidates: Record<keyof DetectedLayers, string[]> = {
        domain: ['Domain', 'Core'],
        application: ['Application', 'App'],
        infrastructure: ['Infrastructure', 'Infra'],
        shared: ['Shared', 'Common'],
        di: ['DI'],
        api: ['API', 'Web', 'WebApi']
    };

    const result: Partial<DetectedLayers> = {};

    for (const [key, names] of Object.entries(candidates)) {

        const found = names
            .map(name => [
                path.join(root, `${solution}.${name}`),
                path.join(root, name)
            ])
            .flat()
            .find(p =>
                fs.existsSync(p) &&
                fs.readdirSync(p).some(f => f.endsWith('.csproj'))
            );

        if (found) {
            (result as any)[key] = found;
        }
    }

    // ✅ Hard guarantees only for core layers
    return {
        domain: result.domain ?? path.join(root, `${solution}.Domain`),
        application: result.application ?? path.join(root, `${solution}.Application`),
        infrastructure: result.infrastructure ?? path.join(root, `${solution}.Infrastructure`),
        shared: result.shared,
        di: result.di,
        api: result.api
    };
}
