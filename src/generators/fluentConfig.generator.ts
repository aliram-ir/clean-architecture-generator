import * as fs from 'fs';
import * as path from 'path';

import { ProjectContext } from '../core/projectContext';
import { scanDomainEntities } from '../core/projectScanner';

/*
|--------------------------------------------------------------------------
| Fluent Configuration Generator (Canonical)
|--------------------------------------------------------------------------
| ✅ IEntityTypeConfiguration<T>
| ✅ DbContext Sync
| ✅ ctx.layers only
*/

export function syncFluentConfigurations(
    ctx: ProjectContext
): void {

    const domainPath = ctx.layers.domain;
    const infrastructurePath = ctx.layers.infrastructure;

    if (!domainPath || !infrastructurePath) {
        throw new Error('Domain or Infrastructure layer not found');
    }

    const entities = scanDomainEntities(domainPath);

    if (entities.length === 0)
        return;

    const configurationsPath = path.join(
        infrastructurePath,
        'Persistence',
        'Configurations'
    );

    fs.mkdirSync(configurationsPath, { recursive: true });

    for (const entity of entities) {
        generateFluentConfig(
            ctx,
            entity.name,
            entity.namespace,
            configurationsPath
        );
    }

    syncDbContext(
        ctx,
        infrastructurePath,
        entities.map(e => e.name)
    );
}

/*
|--------------------------------------------------------------------------
| Generate IEntityTypeConfiguration<T>
|--------------------------------------------------------------------------
*/

function generateFluentConfig(
    ctx: ProjectContext,
    entityName: string,
    entityNamespace: string,
    targetPath: string
): void {

    const filePath = path.join(
        targetPath,
        `${entityName}Configuration.cs`
    );

    if (fs.existsSync(filePath))
        return;

    const content = `using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ${entityNamespace};

namespace ${ctx.solutionName}.Infrastructure.Persistence.Configurations
{
    /// <summary>
    /// Fluent configuration for ${entityName}
    /// </summary>
    public sealed class ${entityName}Configuration : IEntityTypeConfiguration<${entityName}>
    {
        public void Configure(
            EntityTypeBuilder<${entityName}> builder
        )
        {
            builder.HasKey(e => e.Id);

            // TODO: Configure properties & relationships
        }
    }
}
`;

    fs.writeFileSync(filePath, content, 'utf8');
}

/*
|--------------------------------------------------------------------------
| Sync DbContext
|--------------------------------------------------------------------------
*/

function syncDbContext(
    ctx: ProjectContext,
    infrastructurePath: string,
    entityNames: string[]
): void {

    const contextPath = path.join(
        infrastructurePath,
        'Persistence',
        'Contexts'
    );

    if (!fs.existsSync(contextPath))
        return;

    const files = fs.readdirSync(contextPath)
        .filter(f => f.endsWith('DbContext.cs'));

    if (files.length === 0)
        return;

    const dbContextFile = path.join(contextPath, files[0]);
    let content = fs.readFileSync(dbContextFile, 'utf8');

    const marker = 'protected override void OnModelCreating';

    if (!content.includes(marker))
        return;

    const applyLines = entityNames
        .map(e =>
            `            modelBuilder.ApplyConfiguration(new ${e}Configuration());`
        )
        .join('\n');

    if (content.includes(applyLines))
        return;

    content = content.replace(
        /(protected override void OnModelCreating\s*\([\s\S]*?\)\s*\{\s*)/,
        `$1
${applyLines}

`
    );

    fs.writeFileSync(dbContextFile, content, 'utf8');
}
