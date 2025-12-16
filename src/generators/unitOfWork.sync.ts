import * as fs from 'fs';
import * as path from 'path';
import { ProjectContext } from '../core/projectContext';

/*
|--------------------------------------------------------------------------
| Typed UnitOfWork Sync (Correct Layering)
|--------------------------------------------------------------------------
| ✅ IUnitOfWork → Application
| ✅ UnitOfWork → Infrastructure
| ✅ Typed repositories
| ✅ Non-destructive
*/

export function syncUnitOfWork(ctx: ProjectContext, entity: string) {

    syncInterface(ctx, entity);
    syncImplementation(ctx, entity);
}

/*
|--------------------------------------------------------------------------
| IUnitOfWork (Application)
|--------------------------------------------------------------------------
*/

function syncInterface(ctx: ProjectContext, entity: string) {

    const ifaceDir = path.join(
        ctx.layers.application,
        'Interfaces',
        'Repositories'
    );

    const ifacePath = path.join(
        ifaceDir,
        'IUnitOfWork.cs'
    );

    fs.mkdirSync(ifaceDir, { recursive: true });

    if (!fs.existsSync(ifacePath)) {
        fs.writeFileSync(
            ifacePath,
            `namespace ${ctx.solutionName}.Application.Interfaces.Repositories
{
    public interface IUnitOfWork
    {
    }
}
`);
    }

    let content = fs.readFileSync(ifacePath, 'utf8');

    const plural = pluralize(entity);

    const property =
        `        I${entity}Repository ${plural} { get; }`;

    if (!content.includes(property)) {
        content = content.replace(
            '}',
            `${property}\n    }`
        );
        fs.writeFileSync(ifacePath, content, 'utf8');
    }
}

/*
|--------------------------------------------------------------------------
| UnitOfWork Implementation (Infrastructure)
|--------------------------------------------------------------------------
*/

function syncImplementation(ctx: ProjectContext, entity: string) {

    const implDir = path.join(
        ctx.layers.infrastructure,
        'Repositories'
    );

    const implPath = path.join(
        implDir,
        'UnitOfWork.cs'
    );

    fs.mkdirSync(implDir, { recursive: true });

    if (!fs.existsSync(implPath)) {
        fs.writeFileSync(
            implPath,
            unitOfWorkTemplate(ctx)
        );
    }

    let content = fs.readFileSync(implPath, 'utf8');
    const plural = pluralize(entity);

    const field =
        `        private I${entity}Repository? _${plural};`;

    const prop =
        `        public I${entity}Repository ${plural} =>
            _${plural} ??= new ${entity}Repository(_context);`;

    if (!content.includes(field)) {
        content = content.replace(
            '// === Repositories ===',
            `// === Repositories ===\n${field}\n`
        );
    }

    if (!content.includes(` ${plural} =>`)) {
        content = content.replace(
            '// === Properties ===',
            `// === Properties ===\n${prop}\n`
        );
    }

    fs.writeFileSync(implPath, content, 'utf8');
}

/*
|--------------------------------------------------------------------------
| Template
|--------------------------------------------------------------------------
*/

function unitOfWorkTemplate(ctx: ProjectContext): string {
    return `using ${ctx.solutionName}.Application.Interfaces.Repositories;
using ${ctx.solutionName}.Infrastructure.Persistence.Contexts;

namespace ${ctx.solutionName}.Infrastructure.Repositories
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly ApplicationDbContext _context;

        public UnitOfWork(ApplicationDbContext context)
        {
            _context = context;
        }

        // === Repositories ===

        // === Properties ===
    }
}
`;
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function pluralize(name: string): string {
    return name.endsWith('s') ? name : `${name}s`;
}
