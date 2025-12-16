import * as fs from 'fs';
import * as path from 'path';
import { ProjectContext } from '../core/projectContext';

/*
|--------------------------------------------------------------------------
| UnitOfWork Sync (Canonical – Non Entity Based)
|--------------------------------------------------------------------------
| ✅ IUnitOfWork → Application.Interfaces.Base
| ✅ UnitOfWork → Infrastructure.Repositories.Base
| ✅ Transaction support
| ✅ Idempotent
| ✅ No entity coupling
*/

export function syncUnitOfWork(ctx: ProjectContext) {
    syncInterface(ctx);
    syncImplementation(ctx);
}

/*
|--------------------------------------------------------------------------
| IUnitOfWork (Application)
|--------------------------------------------------------------------------
*/

function syncInterface(ctx: ProjectContext) {

    const dir = path.join(
        ctx.layers.application,
        'Interfaces',
        'Base'
    );

    const filePath = path.join(dir, 'IUnitOfWork.cs');

    fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(filePath)) return;

    fs.writeFileSync(
        filePath,
        `using System;
using System.Threading;
using System.Threading.Tasks;

namespace ${ctx.solutionName}.Application.Interfaces.Base
{
    /// <summary>
    /// واحد کار – مدیریت تراکنش و Repository ها
    /// </summary>
    public interface IUnitOfWork : IDisposable
    {
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

        Task BeginTransactionAsync();
        Task CommitTransactionAsync();
        Task RollbackTransactionAsync();
    }
}
`, 'utf8');
}

/*
|--------------------------------------------------------------------------
| UnitOfWork (Infrastructure)
|--------------------------------------------------------------------------
*/

function syncImplementation(ctx: ProjectContext) {

    const dir = path.join(
        ctx.layers.infrastructure,
        'Repositories',
        'Base'
    );

    const filePath = path.join(dir, 'UnitOfWork.cs');

    fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(filePath)) return;

    fs.writeFileSync(
        filePath,
        `using Microsoft.EntityFrameworkCore.Storage;
using ${ctx.solutionName}.Application.Interfaces.Base;
using ${ctx.solutionName}.Infrastructure.Persistence.Contexts;

namespace ${ctx.solutionName}.Infrastructure.Repositories.Base
{
    /// <summary>
    /// پیاده‌سازی UnitOfWork
    /// </summary>
    public class UnitOfWork : IUnitOfWork
    {
        private readonly ApplicationDbContext _context;
        private IDbContextTransaction? _transaction;

        public UnitOfWork(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task BeginTransactionAsync()
        {
            if (_transaction != null) return;
            _transaction = await _context.Database.BeginTransactionAsync();
        }

        public async Task CommitTransactionAsync()
        {
            if (_transaction == null) return;

            await _transaction.CommitAsync();
            await _transaction.DisposeAsync();
            _transaction = null;
        }

        public async Task RollbackTransactionAsync()
        {
            if (_transaction == null) return;

            await _transaction.RollbackAsync();
            await _transaction.DisposeAsync();
            _transaction = null;
        }

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
            => await _context.SaveChangesAsync(cancellationToken);

        public void Dispose()
        {
            _transaction?.Dispose();
            _context.Dispose();
        }
    }
}
`, 'utf8');
}
