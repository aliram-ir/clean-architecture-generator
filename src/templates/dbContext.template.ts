export function dbContextTemplate(solution: string): string {

    return `
using Microsoft.EntityFrameworkCore;

namespace ${solution}.Infrastructure.Persistence.Contexts
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions options)
            : base(options) { }

        // DbSets

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
        }
    }
}
`.trim();
}
