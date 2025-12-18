import * as path from 'path';
import * as fs from 'fs';
import { ProjectContext } from '../core/projectContext';

/*
| ✅ Creates DbContext if missing
| ✅ Keeps formatting clean
| ✅ DbSet<T> ordered and idempotent
| ✅ Fluent configurations applied safely
*/

export function syncDbContext(
    ctx: ProjectContext,
    entity: string
): void {

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

        fs.mkdirSync(
            path.dirname(dbContextPath),
            { recursive: true }
        );

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
                    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
                    {
                    }

                    protected override void OnModelCreating(
                        ModelBuilder modelBuilder
                    )
                    {
                        modelBuilder.ApplyConfigurationsFromAssembly(
                            typeof(ApplicationDbContext).Assembly
                        );

                        base.OnModelCreating(modelBuilder);
                    }
                }
            }
`,
            'utf8'
        );
    }

    let content = fs.readFileSync(dbContextPath, 'utf8');

    // ===============================
    // DbSet<TEntity> sync (clean insert)
    // ===============================
    const dbSetLine =
        `        public DbSet<${entity}> ${entity}s => Set<${entity}>();\n\n`;

    if (!content.includes(`DbSet<${entity}>`)) {

        const classBodyMatch =
            content.match(/public class ApplicationDbContext[\s\S]*?\{([\s\S]*?)protected override void OnModelCreating/);

        if (classBodyMatch) {

            const insertIndex =
                content.indexOf('protected override void OnModelCreating');

            content =
                content.slice(0, insertIndex) +
                dbSetLine +
                content.slice(insertIndex);

            fs.writeFileSync(dbContextPath, content, 'utf8');
        }
    }

    // ===============================
    // Ensure Fluent Configurations Apply
    // ===============================
    if (!content.includes('ApplyConfigurationsFromAssembly')) {

        content = content.replace(
            /protected override void OnModelCreating\s*\(\s*ModelBuilder modelBuilder\s*\)\s*\{/,
            `protected override void OnModelCreating(
            ModelBuilder modelBuilder
        )
        {
            modelBuilder.ApplyConfigurationsFromAssembly(
                typeof(ApplicationDbContext).Assembly
            );`
        );

        fs.writeFileSync(dbContextPath, content, 'utf8');
    }
}
