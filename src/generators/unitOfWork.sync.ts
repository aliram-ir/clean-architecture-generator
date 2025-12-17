import * as fs from 'fs';
import * as path from 'path';
import { ProjectContext } from '../core/projectContext';

/*
|--------------------------------------------------------------------------
| Canonical UnitOfWork Generator
|--------------------------------------------------------------------------
| ✅ Global UoW
| ✅ Transactional
| ✅ Single Source
| ✅ ctx.layers only
*/

export function syncUnitOfWork(
    ctx: ProjectContext
): void {

    const appPath = ctx.layers.application;
    const infraPath = ctx.layers.infrastructure;

    if (!appPath || !infraPath) {
        throw new Error('Application or Infrastructure layer not found');
    }

    generateApplicationInterface(ctx, appPath);
    generateInfrastructureImplementation(ctx, infraPath);
}

/*
|--------------------------------------------------------------------------
| Application Layer – Interface
|--------------------------------------------------------------------------
*/

function generateApplicationInterface(
    ctx: ProjectContext,
    applicationPath: string
): void {

    const interfacesPath = path.join(
        applicationPath,
        'Interfaces',
        'Persistence'
    );

    const filePath = path.join(
        interfacesPath,
        'IUnitOfWork.cs'
    );

    if (fs.existsSync(filePath))
        return;

    fs.mkdirSync(interfacesPath, { recursive: true });

    const content = `using System;
using System.Threading;
using System.Threading.Tasks;

namespace ${ctx.solutionName}.Application.Interfaces.Persistence
{
    /// <summary>
    /// Contract اصلی UnitOfWork
    /// </summary>
    public interface IUnitOfWork : IDisposable
    {
        Task BeginTransactionAsync(
            CancellationToken cancellationToken = default
        );

        Task CommitAsync(
            CancellationToken cancellationToken = default
        );

        Task RollbackAsync(
            CancellationToken cancellationToken = default
        );
    }
}
`;

    fs.writeFileSync(filePath, content, 'utf8');
}

/*
|--------------------------------------------------------------------------
| Infrastructure Layer – Implementation
|--------------------------------------------------------------------------
*/

function generateInfrastructureImplementation(
    ctx: ProjectContext,
    infrastructurePath: string
): void {

    const persistencePath = path.join(
        infrastructurePath,
        'Persistence'
    );

    const filePath = path.join(
        persistencePath,
        'UnitOfWork.cs'
    );

    if (fs.existsSync(filePath))
        return;

    fs.mkdirSync(persistencePath, { recursive: true });

    const content = `using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore.Storage;
using ${ctx.solutionName}.Application.Interfaces.Persistence;
using ${ctx.solutionName}.Infrastructure.Persistence.Contexts;

namespace ${ctx.solutionName}.Infrastructure.Persistence
{
    /// <summary>
    /// پیاده‌سازی Canonical UnitOfWork
    /// </summary>
    public sealed class UnitOfWork : IUnitOfWork
    {
        private readonly ApplicationDbContext _dbContext;
        private IDbContextTransaction? _transaction;

        public UnitOfWork(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

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
                {
                    await _transaction.CommitAsync(cancellationToken);
                }
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
            {
                await _transaction.RollbackAsync(cancellationToken);
            }

            DisposeTransaction();
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
}
