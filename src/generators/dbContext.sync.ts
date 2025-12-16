import * as path from 'path';
import * as fs from 'fs';
import { ProjectContext } from '../core/projectContext';

/**
 * DbContext safe sync
 *
 * ✅ تضمین وجود:
 * - DbSet<TEntity>
 * - modelBuilder.ApplyConfigurationsFromAssembly(...)
 *
 * ✅ Non‑destructive
 * ✅ Safe to re-run
 */
export function syncDbContext(ctx: ProjectContext, entity: string): void {

    const dbContextPath = path.join(
        ctx.layers.infrastructure,
        'Persistence',
        'Contexts',
        'ApplicationDbContext.cs'
    );

    // ===============================
    // Create DbContext if missing
    // ===============================
    if (!fs.existsSync(dbContextPath)) {
        fs.mkdirSync(path.dirname(dbContextPath), { recursive: true });

        fs.writeFileSync(
            dbContextPath,
            `using Microsoft.EntityFrameworkCore;
using ${ctx.solutionName}.Domain.Entities;

namespace ${ctx.solutionName}.Infrastructure.Persistence.Contexts
{
    /// <summary>
    /// EF Core DbContext
    /// </summary>
	public class ApplicationDbContext : DbContext
	{
		public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
			: base(options) { }

		protected override void OnModelCreating(ModelBuilder modelBuilder)
		{
			modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
			base.OnModelCreating(modelBuilder);
		}
	}
}`
        );
    }

    let content = fs.readFileSync(dbContextPath, 'utf8');

    // ===============================
    // DbSet<TEntity> sync
    // ===============================
    const dbSetLine =
        `		public DbSet<${entity}> ${entity}s => Set<${entity}>();\n`;

    if (!content.includes(`DbSet<${entity}>`)) {

        const insertPoint = content.indexOf('protected override void OnModelCreating');

        if (insertPoint !== -1) {
            content =
                content.slice(0, insertPoint) +
                dbSetLine + '\n' +
                content.slice(insertPoint);

            fs.writeFileSync(dbContextPath, content);
        }
    }

    // ===============================
    // Fluent Config Apply Sync
    // ===============================
    if (!content.includes('ApplyConfigurationsFromAssembly')) {

        content = content.replace(
            'protected override void OnModelCreating(ModelBuilder modelBuilder)',
            `protected override void OnModelCreating(ModelBuilder modelBuilder)`
        );

        content = content.replace(
            '{',
            `{
			modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);`
        );

        fs.writeFileSync(dbContextPath, content);
    }
}
