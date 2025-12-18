import * as fs from 'fs';
import * as path from 'path';
import { ProjectContext } from '../core/projectContext';

/*
|--------------------------------------------------------------------------
| Canonical UnitOfWork Sync (Entity‑Aware)
|--------------------------------------------------------------------------
| ✅ Typed Repositories
| ✅ Transactional
| ✅ SaveChangesAsync
| ✅ Lazy Init
| ✅ Non‑destructive
| ✅ ctx.layers only
*/

export function syncUnitOfWork(
    ctx: ProjectContext,
    entity: string
): void {
    syncApplicationInterface(ctx, entity);
    syncInfrastructureImplementation(ctx, entity);
}

/*
|--------------------------------------------------------------------------
| Application Layer – IUnitOfWork
|--------------------------------------------------------------------------
*/

function syncApplicationInterface(
    ctx: ProjectContext,
    entity: string
): void {

    const filePath = path.join(
        ctx.layers.application,
        'Interfaces',
        'Persistence',
        'IUnitOfWork.cs'
    );

    let content: string;

    // ✅ Create if missing
    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });

        content = `using System;
using System.Threading;
using System.Threading.Tasks;
using ${ctx.solutionName}.Application.Interfaces.Repositories;

namespace ${ctx.solutionName}.Application.Interfaces.Persistence
{
    /// <summary>
    /// Contract UnitOfWork
    /// </summary>
    public interface IUnitOfWork : IDisposable
    {
        // ✅ Repositories
        I${entity}Repository ${entity}s { get; }

        // ✅ Transactions
        Task BeginTransactionAsync(CancellationToken cancellationToken = default);
        Task CommitAsync(CancellationToken cancellationToken = default);
        Task RollbackAsync(CancellationToken cancellationToken = default);

        // ✅ Required by Services
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
`;
        fs.writeFileSync(filePath, content, 'utf8');
        return;
    }

    content = fs.readFileSync(filePath, 'utf8');

    const repoLine = `        I${entity}Repository ${entity}s { get; }\n`;

    if (!content.includes(repoLine)) {
        content = content.replace(
            '}',
            `${repoLine}
    }\n`
        );

        fs.writeFileSync(filePath, content, 'utf8');
    }
}

/*
|--------------------------------------------------------------------------
| Infrastructure Layer – UnitOfWork
|--------------------------------------------------------------------------
*/

function syncInfrastructureImplementation(
    ctx: ProjectContext,
    entity: string
): void {

    const filePath = path.join(
        ctx.layers.infrastructure,
        'Persistence',
        'UnitOfWork.cs'
    );

    let content: string;

    // ✅ Create if missing
    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });

        content = `using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore.Storage;
using ${ctx.solutionName}.Application.Interfaces.Persistence;
using ${ctx.solutionName}.Application.Interfaces.Repositories;
using ${ctx.solutionName}.Infrastructure.Persistence.Contexts;
using ${ctx.solutionName}.Infrastructure.Repositories;

namespace ${ctx.solutionName}.Infrastructure.Persistence
{
    /// <summary>
    ///  Implimention UnitOfWork
    /// </summary>
    public sealed class UnitOfWork : IUnitOfWork
    {
        private readonly ApplicationDbContext _dbContext;
        private IDbContextTransaction? _transaction;

        private ${entity}Repository? _${entity.toLowerCase()}s;

        public UnitOfWork(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        // ✅ Typed Repository
        public I${entity}Repository ${entity}s =>
            _${entity.toLowerCase()}s ??=
                new ${entity}Repository(_dbContext);

        public async Task BeginTransactionAsync(
            CancellationToken cancellationToken = default
        )
        {
            if (_transaction != null)
                return;

            _transaction = await _dbContext.Database
                .BeginTransactionAsync(cancellationToken);
        }

        public async Task CommitAsync(
            CancellationToken cancellationToken = default
        )
        {
            try
            {
                await _dbContext.SaveChangesAsync(cancellationToken);

                if (_transaction != null)
                    await _transaction.CommitAsync(cancellationToken);
            }
            catch
            {
                await RollbackAsync(cancellationToken);
                throw;
            }
            finally
            {
                DisposeTransaction();
            }
        }

        public async Task RollbackAsync(
            CancellationToken cancellationToken = default
        )
        {
            if (_transaction != null)
                await _transaction.RollbackAsync(cancellationToken);

            DisposeTransaction();
        }

        public Task<int> SaveChangesAsync(
            CancellationToken cancellationToken = default
        )
        {
            return _dbContext.SaveChangesAsync(cancellationToken);
        }

        private void DisposeTransaction()
        {
            _transaction?.Dispose();
            _transaction = null;
        }

        public void Dispose()
        {
            DisposeTransaction();
            _dbContext.Dispose();
        }
    }
}
`;
        fs.writeFileSync(filePath, content, 'utf8');
        return;
    }

    content = fs.readFileSync(filePath, 'utf8');

    // ✅ Inject private field
    if (!content.includes(`_${entity.toLowerCase()}s`)) {
        content = content.replace(
            'public sealed class UnitOfWork : IUnitOfWork',
            `public sealed class UnitOfWork : IUnitOfWork
    {
        private ${entity}Repository? _${entity.toLowerCase()}s;
`
        );
    }

    // ✅ Inject property
    if (!content.includes(`I${entity}Repository ${entity}s`)) {
        content = content.replace(
            'public async Task BeginTransactionAsync',
            `public I${entity}Repository ${entity}s =>
            _${entity.toLowerCase()}s ??=
                new ${entity}Repository(_dbContext);

        public async Task BeginTransactionAsync`
        );
    }

    fs.writeFileSync(filePath, content, 'utf8');
}
