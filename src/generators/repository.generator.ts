import * as path from 'path';
import * as fs from 'fs';
import { ProjectContext } from '../core/projectContext';
import { writeIfMissing } from '../core/helpers';

/*
|--------------------------------------------------------------------------
| Repository Generator (Final Canonical)
|--------------------------------------------------------------------------
| ✅ Application owns Contracts
| ✅ Infrastructure owns Implementations
| ✅ IRepository signature == za Golden Sample
| ✅ Idempotent / Non‑destructive
| ✅ ctx.layers only
*/

export function generateRepository(
    ctx: ProjectContext,
    entity: string
): void {

    // ------------------------------------------------------------
    // Paths
    // ------------------------------------------------------------

    const appRepositoriesBasePath = path.join(
        ctx.layers.application,
        'Interfaces',
        'Repositories',
        'Base'
    );

    const appRepositoriesPath = path.join(
        ctx.layers.application,
        'Interfaces',
        'Repositories'
    );

    const infraRepositoriesBasePath = path.join(
        ctx.layers.infrastructure,
        'Repositories',
        'Base'
    );

    const infraRepositoriesPath = path.join(
        ctx.layers.infrastructure,
        'Repositories'
    );

    // ------------------------------------------------------------
    // Ensure directories
    // ------------------------------------------------------------

    fs.mkdirSync(appRepositoriesBasePath, { recursive: true });
    fs.mkdirSync(appRepositoriesPath, { recursive: true });
    fs.mkdirSync(infraRepositoriesBasePath, { recursive: true });
    fs.mkdirSync(infraRepositoriesPath, { recursive: true });

    // ------------------------------------------------------------
    // 1. IRepository<T> – Application (Base Contract)
    // ------------------------------------------------------------

    writeIfMissing(
        path.join(appRepositoriesBasePath, 'IRepository.cs'),
        `using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;

namespace ${ctx.solutionName}.Application.Interfaces.Repositories.Base
{
    // ✅ Generic Repository Contract (Canonical)
    public interface IRepository<T> where T : class
    {
        Task<T?> GetByIdAsync(
            Guid id,
            Func<IQueryable<T>, IQueryable<T>>? include = null,
            CancellationToken cancellationToken = default);

        Task<IEnumerable<T>> GetAllAsync(
            Func<IQueryable<T>, IQueryable<T>>? include = null,
            bool disableTracking = true,
            CancellationToken cancellationToken = default);

        Task<IEnumerable<T>> GetAllAsync(
            Expression<Func<T, bool>>? filter = null,
            Func<IQueryable<T>, IQueryable<T>>? include = null,
            bool disableTracking = true,
            CancellationToken cancellationToken = default);

        Task<IEnumerable<T>> FindAsync(
            Expression<Func<T, bool>> predicate,
            Func<IQueryable<T>, IQueryable<T>>? include = null,
            bool disableTracking = true,
            CancellationToken cancellationToken = default);

        Task<T?> FirstOrDefaultAsync(
            Expression<Func<T, bool>> predicate,
            Func<IQueryable<T>, IQueryable<T>>? include = null,
            bool disableTracking = true,
            CancellationToken cancellationToken = default);

        Task<T?> SingleOrDefaultAsync(
            Expression<Func<T, bool>> predicate,
            Func<IQueryable<T>, IQueryable<T>>? include = null,
            bool disableTracking = true,
            CancellationToken cancellationToken = default);

        Task<int> CountAsync(
            Expression<Func<T, bool>>? predicate = null,
            CancellationToken cancellationToken = default);

        Task<bool> AnyAsync(
            Expression<Func<T, bool>> predicate,
            CancellationToken cancellationToken = default);

        Task<T> AddAsync(T entity, CancellationToken cancellationToken = default);
        Task AddRangeAsync(IEnumerable<T> entities, CancellationToken cancellationToken = default);

        void Update(T entity);
        void UpdateRange(IEnumerable<T> entities);

        void Remove(T entity);
        void RemoveRange(IEnumerable<T> entities);

        Task<(IEnumerable<T> Items, int TotalCount)> GetPagedAsync(
            int pageNumber,
            int pageSize,
            Expression<Func<T, bool>>? predicate = null,
            Func<IQueryable<T>, IQueryable<T>>? include = null,
            Expression<Func<T, object>>? orderBy = null,
            bool ascending = true,
            bool disableTracking = true,
            CancellationToken cancellationToken = default);
    }
}
`
    );

    // ------------------------------------------------------------
    // 2. I{Entity}Repository – Application (Specific Contract)
    // ------------------------------------------------------------

    writeIfMissing(
        path.join(appRepositoriesPath, `I${entity}Repository.cs`),
        `using ${ctx.solutionName}.Domain.Entities;
using ${ctx.solutionName}.Application.Interfaces.Repositories.Base;

namespace ${ctx.solutionName}.Application.Interfaces.Repositories
{
    // ✅ Repository Contract for ${entity}
    public interface I${entity}Repository : IRepository<${entity}>
    {
        // ✅ Entity‑specific queries go here
    }
}
`
    );

    // ------------------------------------------------------------
    // 3. Repository<T> – Infrastructure (Base Implementation)
    // ------------------------------------------------------------

    writeIfMissing(
        path.join(infraRepositoriesBasePath, 'Repository.cs'),
        `using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ${ctx.solutionName}.Application.Interfaces.Repositories.Base;
using ${ctx.solutionName}.Infrastructure.Persistence.Contexts;

namespace ${ctx.solutionName}.Infrastructure.Repositories.Base
{
    // ✅ EF Core Generic Repository
    public class Repository<T> : IRepository<T> where T : class
    {
        protected readonly ApplicationDbContext _context;
        protected readonly DbSet<T> _dbSet;

        public Repository(ApplicationDbContext context)
        {
            _context = context;
            _dbSet = context.Set<T>();
        }

        protected IQueryable<T> ApplyIncludesAndTracking(
            IQueryable<T> query,
            Func<IQueryable<T>, IQueryable<T>>? include,
            bool disableTracking)
        {
            if (include != null)
                query = include(query);

            if (disableTracking)
                query = query.AsNoTracking();

            return query;
        }

        public async Task<T?> GetByIdAsync(
            Guid id,
            Func<IQueryable<T>, IQueryable<T>>? include = null,
            CancellationToken cancellationToken = default)
        {
            IQueryable<T> query = _dbSet;

            if (include != null)
                query = include(query);

            // ✅ فرض: تمام Entityها دارای Id از نوع Guid هستند
            return await query.FirstOrDefaultAsync(
                e => EF.Property<Guid>(e, "Id") == id,
                cancellationToken);
        }

        public async Task<IEnumerable<T>> GetAllAsync(
            Func<IQueryable<T>, IQueryable<T>>? include = null,
            bool disableTracking = true,
            CancellationToken cancellationToken = default)
        {
            var query = ApplyIncludesAndTracking(_dbSet, include, disableTracking);
            return await query.ToListAsync(cancellationToken);
        }

        public async Task<IEnumerable<T>> GetAllAsync(
            Expression<Func<T, bool>>? filter = null,
            Func<IQueryable<T>, IQueryable<T>>? include = null,
            bool disableTracking = true,
            CancellationToken cancellationToken = default)
        {
            IQueryable<T> query = _dbSet;

            if (filter != null)
                query = query.Where(filter);

            query = ApplyIncludesAndTracking(query, include, disableTracking);
            return await query.ToListAsync(cancellationToken);
        }

        public async Task<IEnumerable<T>> FindAsync(
            Expression<Func<T, bool>> predicate,
            Func<IQueryable<T>, IQueryable<T>>? include = null,
            bool disableTracking = true,
            CancellationToken cancellationToken = default)
        {
            var query = ApplyIncludesAndTracking(
                _dbSet.Where(predicate),
                include,
                disableTracking);

            return await query.ToListAsync(cancellationToken);
        }

        public async Task<T?> FirstOrDefaultAsync(
            Expression<Func<T, bool>> predicate,
            Func<IQueryable<T>, IQueryable<T>>? include = null,
            bool disableTracking = true,
            CancellationToken cancellationToken = default)
        {
            var query = ApplyIncludesAndTracking(
                _dbSet.Where(predicate),
                include,
                disableTracking);

            return await query.FirstOrDefaultAsync(cancellationToken);
        }

        public async Task<T?> SingleOrDefaultAsync(
            Expression<Func<T, bool>> predicate,
            Func<IQueryable<T>, IQueryable<T>>? include = null,
            bool disableTracking = true,
            CancellationToken cancellationToken = default)
        {
            var query = ApplyIncludesAndTracking(
                _dbSet.Where(predicate),
                include,
                disableTracking);

            return await query.SingleOrDefaultAsync(cancellationToken);
        }

        public async Task<int> CountAsync(
            Expression<Func<T, bool>>? predicate = null,
            CancellationToken cancellationToken = default)
        {
            return predicate == null
                ? await _dbSet.CountAsync(cancellationToken)
                : await _dbSet.CountAsync(predicate, cancellationToken);
        }

        public async Task<bool> AnyAsync(
            Expression<Func<T, bool>> predicate,
            CancellationToken cancellationToken = default)
        {
            return await _dbSet.AnyAsync(predicate, cancellationToken);
        }

        public async Task<T> AddAsync(T entity, CancellationToken cancellationToken = default)
        {
            await _dbSet.AddAsync(entity, cancellationToken);
            return entity;
        }

        public async Task AddRangeAsync(
            IEnumerable<T> entities,
            CancellationToken cancellationToken = default)
        {
            await _dbSet.AddRangeAsync(entities, cancellationToken);
        }

        public void Update(T entity) => _dbSet.Update(entity);
        public void UpdateRange(IEnumerable<T> entities) => _dbSet.UpdateRange(entities);

        public void Remove(T entity) => _dbSet.Remove(entity);
        public void RemoveRange(IEnumerable<T> entities) => _dbSet.RemoveRange(entities);

        public async Task<(IEnumerable<T> Items, int TotalCount)> GetPagedAsync(
            int pageNumber,
            int pageSize,
            Expression<Func<T, bool>>? predicate = null,
            Func<IQueryable<T>, IQueryable<T>>? include = null,
            Expression<Func<T, object>>? orderBy = null,
            bool ascending = true,
            bool disableTracking = true,
            CancellationToken cancellationToken = default)
        {
            IQueryable<T> query = _dbSet;

            if (predicate != null)
                query = query.Where(predicate);

            query = ApplyIncludesAndTracking(query, include, disableTracking);

            var totalCount = await query.CountAsync(cancellationToken);

            if (orderBy != null)
                query = ascending
                    ? query.OrderBy(orderBy)
                    : query.OrderByDescending(orderBy);

            var items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            return (items, totalCount);
        }
    }
}
`
    );

    // ------------------------------------------------------------
    // 4. {Entity}Repository – Infrastructure (Specific)
    // ------------------------------------------------------------

    writeIfMissing(
        path.join(infraRepositoriesPath, `${entity}Repository.cs`),
        `using ${ctx.solutionName}.Domain.Entities;
using ${ctx.solutionName}.Application.Interfaces.Repositories;
using ${ctx.solutionName}.Infrastructure.Persistence.Contexts;
using ${ctx.solutionName}.Infrastructure.Repositories.Base;

namespace ${ctx.solutionName}.Infrastructure.Repositories
{
    // ✅ Repository Implementation for ${entity}
    public sealed class ${entity}Repository
        : Repository<${entity}>, I${entity}Repository
    {
        public ${entity}Repository(ApplicationDbContext context)
            : base(context)
        {
        }
    }
}
`
    );
}
