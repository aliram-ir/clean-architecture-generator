import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { ProjectContext } from '../core/projectContext';
import { pluralize, writeIfMissing } from '../core/helpers';

/*
|--------------------------------------------------------------------------
| Utils
|--------------------------------------------------------------------------
*/

function toFolderName(name: string): string {
    return pluralize(name).toLowerCase(); // ✅ users, orders, products
}

function toPascal(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
}

/*
|--------------------------------------------------------------------------
| DTO Generator (Canonical – Locked)
|--------------------------------------------------------------------------
| ✅ Folder‑Driven Namespace
| ✅ Case‑Safe (Linux / CI)
| ✅ Golden Sample za
| ✅ One‑Shot – Frozen
*/

function extractProperties(
    entityContent: string
): { type: string; name: string }[] {

    const regex =
        /public\s+(?:virtual\s+)?(?<type>\w+(?:<\s*\w+\s*>)?\??)\s+(?<name>\w+)\s*{\s*get;\s*(?:set;|private\s+set;)\s*}/g;

    const result: { type: string; name: string }[] = [];
    let match;

    while ((match = regex.exec(entityContent)) !== null) {
        if (match.groups) {
            result.push({
                type: match.groups.type,
                name: match.groups.name
            });
        }
    }

    return result;
}

export function generateDtos(
    ctx: ProjectContext,
    entity: string,
    entityFilePath: string
): void {

    const entityName = toPascal(entity);          // User
    const folderName = toFolderName(entity);      // users

    const dtoRoot = path.join(
        ctx.layers.application,
        'DTOs',
        folderName
    );

    fs.mkdirSync(dtoRoot, { recursive: true });

    let properties: { type: string; name: string }[];

    try {
        const content = fs.readFileSync(entityFilePath, 'utf8');
        properties = extractProperties(content);
    } catch (e: any) {
        vscode.window.showErrorMessage(`❌ Cannot read Entity: ${entityFilePath}`);
        return;
    }

    // --------------------------------------------------
    // ${Entity}Dto
    // --------------------------------------------------

    writeIfMissing(
        path.join(dtoRoot, `${entityName}Dto.cs`),
        `using System;

namespace ${ctx.solutionName}.Application.DTOs.${folderName}
{
    public class ${entityName}Dto
    {
${properties.map(p => `        public ${p.type} ${p.name} { get; set; }`).join('\n')}
    }
}
`
    );

    // --------------------------------------------------
    // Create${Entity}Dto
    // --------------------------------------------------

    writeIfMissing(
        path.join(dtoRoot, `Create${entityName}Dto.cs`),
        `namespace ${ctx.solutionName}.Application.DTOs.${folderName}
{
    public class Create${entityName}Dto
    {
${properties
            .filter(p => p.name !== 'Id' && !p.name.endsWith('At'))
            .map(p => `        public ${p.type} ${p.name} { get; set; }`)
            .join('\n')}
    }
}
`
    );

    // --------------------------------------------------
    // Update${Entity}Dto
    // --------------------------------------------------

    writeIfMissing(
        path.join(dtoRoot, `Update${entityName}Dto.cs`),
        `using System;

namespace ${ctx.solutionName}.Application.DTOs.${folderName}
{
    public class Update${entityName}Dto
    {
${properties
            .filter(p => p.name !== 'CreatedAt')
            .map(p => `        public ${p.type} ${p.name} { get; set; }`)
            .join('\n')}
    }
}
`
    );
}
