export function diTemplate(solution: string): string {

    return `
using Microsoft.Extensions.DependencyInjection;

namespace ${solution}.DI.Extensions
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddApplication(this IServiceCollection services)
        {
            // Repositories

            // Services

            return services;
        }
    }
}
`.trim();
}
