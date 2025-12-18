import * as fs from 'fs';
import * as path from 'path';
import { ProjectContext } from '../core/projectContext';
import { scanDomainEntities } from '../core/projectScanner';

/*
|--------------------------------------------------------------------------
| Fluent Configuration Generator (Canonical v2.1.1)
|--------------------------------------------------------------------------
| ✅ Reflective configuration generator
| ✅ Idempotent creation in Infrastructure.Persistence.Configurations
| ✅ Syncs DbContext automatically
| ✅ Reads entity metadata (properties & relationships)
*/

export function syncFluentConfigurations(ctx: ProjectContext): void {
    const domainPath = ctx.layers.domain;
    const infrastructurePath = ctx.layers.infrastructure;

    if (!domainPath || !infrastructurePath)
        throw new Error('Domain or Infrastructure layer not found');

    const entities = scanDomainEntities(domainPath);
    if (entities.length === 0) return;

    const configsPath = path.join(infrastructurePath, 'Persistence', 'Configurations');
    fs.mkdirSync(configsPath, { recursive: true });

    for (const entity of entities) {
        generateFluentConfig(ctx, entity.name, entity.namespace, entity.filePath, configsPath);
    }

    syncDbContext(ctx, infrastructurePath, entities.map(e => e.name));
}

/*
|--------------------------------------------------------------------------
| Generate IEntityTypeConfiguration<T> Based on Entity Structure
|--------------------------------------------------------------------------
| 🔹 Scans *.cs entity source code
| 🔹 Detects primary key (Id or [Key])
| 🔹 Generates HasOne/HasMany relations if types match domain entities
| 🔹 Generates Property for scalar (primitive) types
*/

function generateFluentConfig(
    ctx: ProjectContext,
    entityName: string,
    entityNamespace: string,
    entityPath: string,
    targetPath: string
): void {
    const filePath = path.join(targetPath, `${entityName}Configuration.cs`);
    if (fs.existsSync(filePath)) return;

    const raw = fs.readFileSync(entityPath, 'utf8');
    const propertyRegex = /public\s+([A-Za-z0-9_<>\[\]?]+)\s+([A-Za-z0-9_]+)\s*\{/g;
    const matches = Array.from(raw.matchAll(propertyRegex));

    // Extract simple & navigation properties
    const props = matches.map(m => {
        const type = m[1];
        const name = m[2];
        return {
            type,
            name,
            isCollection: /(ICollection|List|HashSet)</.test(type),
            isEntity:
                /^[A-Z]/.test(type) &&
                !/(string|int|long|Guid|DateTime|bool|decimal|double|float)/.test(type)
        };
    });

    // Detect primary key
    const key = props.find(p => p.name.toLowerCase() === 'id')?.name ?? 'Id';

    let body = `builder.HasKey(e => e.${key});\n\n`;

    for (const p of props) {
        if (!p.isEntity && !p.isCollection) {
            body += `builder.Property(e => e.${p.name});\n`;
        } else if (p.isEntity) {
            body += `builder.HasOne(e => e.${p.name}).WithMany();\n`;
        } else if (p.isCollection) {
            body += `builder.HasMany(e => e.${p.name}).WithOne();\n`;
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
    public sealed class ${entityName}Configuration : IEntityTypeConfiguration<${entityName}>
    {
        public void Configure(EntityTypeBuilder<${entityName}> builder)
        {
${indentLines(body)}
        }
    }
}
`;

    fs.writeFileSync(filePath, content, 'utf8');
}

/*
|--------------------------------------------------------------------------
| Helper: Indent lines
|--------------------------------------------------------------------------
*/
function indentLines(content: string): string {
    return content
        .trim()
        .split('\n')
        .map(l => '            ' + l.trim())
        .join('\n');
}

/*
|--------------------------------------------------------------------------
| Sync DbContext with Generated Configurations
|--------------------------------------------------------------------------
| ✅ Adds missing modelBuilder.ApplyConfiguration(new EntityConfiguration())
| ✅ Detects existing lines to avoid duplicates
| ✅ Works for any DbContext under Infrastructure.Persistence.Contexts
*/

function syncDbContext(
    ctx: ProjectContext,
    infrastructurePath: string,
    entityNames: string[]
): void {
    const contextPath = path.join(infrastructurePath, 'Persistence', 'Contexts');
    if (!fs.existsSync(contextPath)) return;

    const dbContextFiles = fs.readdirSync(contextPath).filter(f => f.endsWith('DbContext.cs'));
    if (dbContextFiles.length === 0) return;

    const dbContextFile = path.join(contextPath, dbContextFiles[0]);
    let dbContent = fs.readFileSync(dbContextFile, 'utf8');

    const marker = 'protected override void OnModelCreating';
    if (!dbContent.includes(marker)) return;

    const applyLines = entityNames.map(e => `            modelBuilder.ApplyConfiguration(new ${e}Configuration());`).join('\n');
    if (entityNames.some(e => dbContent.includes(`${e}Configuration()`))) return;

    dbContent = dbContent.replace(
        /(protected override void OnModelCreating\s*\([\s\S]*?\)\s*\{\s*)/,
        `$1\n${applyLines}\n`
    );

    fs.writeFileSync(dbContextFile, dbContent, 'utf8');
}
