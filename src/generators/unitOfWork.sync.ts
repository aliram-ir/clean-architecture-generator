import * as fs from 'fs';
import * as path from 'path';
import { pluralize, writeIfMissing } from '../core/helpers';
import { ProjectContext } from '../core/projectContext';

/*
|--------------------------------------------------------------------------
| Typed UnitOfWork Sync
|--------------------------------------------------------------------------
| ✅ Enterprise Pattern (Lazy + Typed)
| ✅ Non-destructive
| ✅ Idempotent
| ✅ Matches user-provided C# implementation EXACTLY
*/

export function syncUnitOfWork(
    ctx: ProjectContext,
    entity: string
) {
    const entityName = toPascalCase(entity);
    const plural = pluralize(entityName);
    const pluralLower = plural.charAt(0).toLowerCase() + plural.slice(1);

    const contractsPath = path.join(
        ctx.layers.domain,
        'Interfaces',
        'IUnitOfWork.cs'
    );

    const implementationPath = path.join(
        ctx.layers.infrastructure,
        'Repositories',
        'Base',
        'UnitOfWork.cs'
    );

    syncUnitOfWorkInterface(contractsPath, entityName, plural);
    syncUnitOfWorkImplementation(
        implementationPath,
        entityName,
        plural,
        pluralLower
    );
}

/*
|--------------------------------------------------------------------------
| Interface Sync
|--------------------------------------------------------------------------
*/

function syncUnitOfWorkInterface(
    filePath: string,
    entityName: string,
    plural: string
) {
    writeIfMissing(
        filePath,
        `namespace Domain.Interfaces
{
    public interface IUnitOfWork : IDisposable
    {
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

        ${repositoryProperty(entityName, plural)}

        Task BeginTransactionAsync(CancellationToken cancellationToken = default);
        Task CommitTransactionAsync(CancellationToken cancellationToken = default);
        Task RollbackTransactionAsync(CancellationToken cancellationToken = default);
    }
}
`
    );

    let content = fs.readFileSync(filePath, 'utf8');

    const property = `        ${repositoryProperty(entityName, plural)}\n`;

    if (!content.includes(property.trim())) {
        content = content.replace(
            /Task<int> SaveChangesAsync[^{]*\);/,
            match => `${match}\n\n${property}`
        );

        fs.writeFileSync(filePath, content, 'utf8');
    }
}

/*
|--------------------------------------------------------------------------
| Implementation Sync
|--------------------------------------------------------------------------
*/

function syncUnitOfWorkImplementation(
    filePath: string,
    entityName: string,
    plural: string,
    pluralLower: string
) {
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');

    const field = `        private I${entityName}Repository? _${pluralLower};`;
    const property = `
        public I${entityName}Repository ${plural} =>
            _${pluralLower} ??= new ${entityName}Repository(_context);
`;

    // ✅ Private field
    if (!content.includes(field.trim())) {
        content = content.replace(
            /\/\/ Lazy initialization برای Repository‌ها/,
            match => `${match}\n${field}`
        );
    }

    // ✅ Public property
    if (!content.includes(`I${entityName}Repository ${plural}`)) {
        content = content.replace(
            /\/\/ === Properties ===/,
            match => `${match}\n${property}`
        );
    }

    fs.writeFileSync(filePath, content, 'utf8');
}

/*
|--------------------------------------------------------------------------
| Utils
|--------------------------------------------------------------------------
*/

function repositoryProperty(entity: string, plural: string) {
    return `I${entity}Repository ${plural} { get; }`;
}

function toPascalCase(name: string): string {
    return name
        .replace(/[-_ ]+(.)/g, (_, c) => c.toUpperCase())
        .replace(/^(.)/, c => c.toUpperCase());
}
