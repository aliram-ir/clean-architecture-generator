import * as fs from 'fs';
import * as path from 'path';

/*
|--------------------------------------------------------------------------
| Project Scanner (Canonical)
|--------------------------------------------------------------------------
| ✅ Pure filesystem scanner
| ✅ No Core contracts dependency
| ✅ Works only with layer physical paths
*/

export interface ScannedType {
    name: string;
    filePath: string;
    namespace: string;
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function scanCsFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];

    const result: string[] = [];

    for (const item of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, item);

        if (fs.statSync(fullPath).isDirectory()) {
            result.push(...scanCsFiles(fullPath));
        } else if (item.endsWith('.cs')) {
            result.push(fullPath);
        }
    }

    return result;
}

function extractNamespace(fileContent: string): string {
    const match = fileContent.match(/namespace\s+([A-Za-z0-9_.]+)/);
    return match ? match[1] : '';
}

function extractTypeName(filePath: string): string {
    return path.basename(filePath, '.cs');
}

/*
|--------------------------------------------------------------------------
| Public Scanners
|--------------------------------------------------------------------------
*/

export function scanApplicationServices(
    applicationPath: string
): ScannedType[] {

    const servicesRoot = path.join(applicationPath, 'Services');
    const files = scanCsFiles(servicesRoot);

    return files
        .filter(f => f.endsWith('Service.cs'))
        .map(file => {
            const content = fs.readFileSync(file, 'utf8');

            return {
                name: extractTypeName(file),
                filePath: file,
                namespace: extractNamespace(content)
            };
        });
}

/**
 * Application/Interfaces/Services/I*.cs
 */
export function scanApplicationServiceInterfaces(
    applicationPath: string
): ScannedType[] {

    const interfacesRoot = path.join(
        applicationPath,
        'Interfaces',
        'Services'
    );

    const files = scanCsFiles(interfacesRoot);

    return files
        .filter(f => path.basename(f).startsWith('I'))
        .map(file => {
            const content = fs.readFileSync(file, 'utf8');

            return {
                name: extractTypeName(file),
                filePath: file,
                namespace: extractNamespace(content)
            };
        });
}

export function scanInfrastructureRepositories(
    infrastructurePath: string
): ScannedType[] {

    const repoRoot = path.join(infrastructurePath, 'Repositories');
    const files = scanCsFiles(repoRoot);

    return files
        .filter(f => f.endsWith('Repository.cs'))
        .map(file => {
            const content = fs.readFileSync(file, 'utf8');

            return {
                name: extractTypeName(file),
                filePath: file,
                namespace: extractNamespace(content)
            };
        });
}

/**
 * Domain/Entities/*.cs
 */
export function scanDomainEntities(
    domainPath: string
): ScannedType[] {

    const entitiesRoot = path.join(domainPath, 'Entities');
    const files = scanCsFiles(entitiesRoot);

    return files.map(file => {
        const content = fs.readFileSync(file, 'utf8');

        return {
            name: extractTypeName(file),
            filePath: file,
            namespace: extractNamespace(content)
        };
    });
}
