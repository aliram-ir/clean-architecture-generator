import * as fs from 'fs';
import * as path from 'path';
import { ProjectContext } from '../core/projectContext';
import { scanDomainEntities } from '../core/projectScanner';

/*
|--------------------------------------------------------------------------
| Canonical Fluent Configuration Generator (LOCKED v2.1.1)
|--------------------------------------------------------------------------
| ✅ Pure FS scan
| ✅ Entity‑aware (no false Property)
| ✅ Navigation‑safe
| ✅ Idempotent
*/

export function syncFluentConfigurations(ctx: ProjectContext): void {

    const domainPath = ctx.layers.domain;
    const infrastructurePath = ctx.layers.infrastructure;

    if (!domainPath || !infrastructurePath)
        throw new Error('Domain or Infrastructure layer not found');

    const entities = scanDomainEntities(domainPath);
    if (entities.length === 0) return;

    const entityNames = entities.map(e => e.name);

    const configsPath = path.join(
        infrastructurePath,
        'Persistence',
        'Configurations'
    );

    fs.mkdirSync(configsPath, { recursive: true });

    for (const entity of entities) {
        generateFluentConfig(
            ctx,
            entity.name,
            entity.namespace,
            entity.filePath,
            configsPath,
            entityNames
        );
    }

    syncDbContext(ctx, infrastructurePath, entityNames);
}

/*
|--------------------------------------------------------------------------
| Generate Single IEntityTypeConfiguration<T>
|--------------------------------------------------------------------------
*/

function generateFluentConfig(
    ctx: ProjectContext,
    entityName: string,
    entityNamespace: string,
    entityPath: string,
    targetPath: string,
    allEntities: string[]
): void {

    const filePath = path.join(
        targetPath,
        `${entityName}Configuration.cs`
    );

    if (fs.existsSync(filePath)) return;

    const raw = fs.readFileSync(entityPath, 'utf8');

    const propertyRegex =
        /public\s+([A-Za-z0-9_<>\[\]?]+)\s+([A-Za-z0-9_]+)\s*\{/g;

    const matches = Array.from(raw.matchAll(propertyRegex));

    const properties = matches.map(m => {

        const type = m[1];
        const name = m[2];

        const isCollection =
            /(ICollection|List|HashSet)</.test(type);

        const pureType =
            type.replace(/ICollection<|List<|HashSet<|>/g, '');

        const isEntity =
            allEntities.includes(pureType);

        const isScalar =
            !isEntity &&
            !isCollection &&
            /(string|int|long|Guid|DateTime|bool|decimal|double|float)/.test(type);

        return {
            name,
            type,
            pureType,
            isScalar,
            isEntity,
            isCollection
        };
    });

    // -----------------------------
    // Primary Key
    // -----------------------------
    const key =
        properties.find(p => p.name === 'Id')?.name ?? 'Id';

    let body = `builder.HasKey(e => e.${key});\n`;

    // -----------------------------
    // Properties & Relations
    // -----------------------------
    for (const p of properties) {

        if (p.name === entityName)
            continue;

        if (p.name === key)
            continue;

        if (p.isScalar) {
            body += `\nbuilder.Property(e => e.${p.name});`;
            continue;
        }

        if (p.isEntity) {
            body += `\nbuilder.HasOne(e => e.${p.name}).WithMany();`;
            continue;
        }

        if (p.isCollection && allEntities.includes(p.pureType)) {
            body += `\nbuilder.HasMany(e => e.${p.name}).WithOne();`;
            continue;
        }
    }

    const content = `using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ${entityNamespace};

namespace ${ctx.solutionName}.Infrastructure.Persistence.Configurations
{
    /// <summary>
    /// Canonical fluent configuration for ${entityName}.
    /// Auto-generated from entity structure.
    /// </summary>
    public sealed class ${entityName}Configuration
        : IEntityTypeConfiguration<${entityName}>
    {
        public void Configure(
            EntityTypeBuilder<${entityName}> builder
        )
        {
${indent(body)}
        }
    }
}
`;

    fs.writeFileSync(filePath, content, 'utf8');
}

/*
|--------------------------------------------------------------------------
| Indent Helper
|--------------------------------------------------------------------------
*/
function indent(content: string): string {
    return content
        .trim()
        .split('\n')
        .map(l => '            ' + l)
        .join('\n');
}

/*
|--------------------------------------------------------------------------
| DbContext Sync (ApplyConfiguration)
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

    if (!fs.existsSync(contextPath)) return;

    const dbContextFile =
        fs.readdirSync(contextPath).find(f => f.endsWith('DbContext.cs'));

    if (!dbContextFile) return;

    const fullPath = path.join(contextPath, dbContextFile);
    let content = fs.readFileSync(fullPath, 'utf8');

    if (entityNames.some(e => content.includes(`${e}Configuration()`)))
        return;

    const applyLines =
        entityNames
            .map(e => `            modelBuilder.ApplyConfiguration(new ${e}Configuration());`)
            .join('\n');

    content = content.replace(
        /(protected override void OnModelCreating\s*\([\s\S]*?\)\s*\{\s*)/,
        `$1\n${applyLines}\n`
    );

    fs.writeFileSync(fullPath, content, 'utf8');
}
