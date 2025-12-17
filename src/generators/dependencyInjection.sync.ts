import * as fs from 'fs';
import * as path from 'path';

import { ProjectContext } from '../core/projectContext';
import {
    scanApplicationServices,
    scanApplicationServiceInterfaces,
    scanInfrastructureRepositories
} from '../core/projectScanner';

/*
|--------------------------------------------------------------------------
| Dependency Injection Sync (Canonical)
|--------------------------------------------------------------------------
| ✅ Scan واقعی
| ✅ Global registrations
| ✅ Idempotent
| ✅ ctx.layers only
*/

export function syncDependencyInjection(
    ctx: ProjectContext
): void {

    const applicationPath = ctx.layers.application;
    const infrastructurePath = ctx.layers.infrastructure;
    const diPath = ctx.layers.di;

    if (!applicationPath || !infrastructurePath || !diPath) {
        throw new Error('Missing required layers for DI');
    }

    const extensionsPath = path.join(diPath, 'Extensions');
    const filePath = path.join(
        extensionsPath,
        'ServiceCollectionExtensions.cs'
    );

    fs.mkdirSync(extensionsPath, { recursive: true });

    // ✅ Pure FS scans
    const services = scanApplicationServices(applicationPath);
    const serviceInterfaces = scanApplicationServiceInterfaces(applicationPath);
    const repositories = scanInfrastructureRepositories(infrastructurePath);

    const registrations: string[] = [];

    /*
    |--------------------------------------------------------------------------
    | Application Services
    |--------------------------------------------------------------------------
    */
    for (const svc of services) {

        const iface = serviceInterfaces.find(
            i => i.name === `I${svc.name}`
        );

        if (!iface) continue;

        registrations.push(
            `services.AddScoped<${iface.namespace}.${iface.name}, ${svc.namespace}.${svc.name}>();`
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Infrastructure Repositories
    |--------------------------------------------------------------------------
    */
    for (const repo of repositories) {

        const ifaceName = `I${repo.name}`;
        const ifaceNamespace =
            `${ctx.solutionName}.Application.Interfaces.Repositories`;

        registrations.push(
            `services.AddScoped<${ifaceNamespace}.${ifaceName}, ${repo.namespace}.${repo.name}>();`
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Core Infrastructure
    |--------------------------------------------------------------------------
    */
    registrations.push(
        `services.AddScoped<${ctx.solutionName}.Application.Interfaces.Persistence.IUnitOfWork, ${ctx.solutionName}.Infrastructure.Persistence.UnitOfWork>();`
    );

    const content = `using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;

using ${ctx.solutionName}.Infrastructure.Persistence.Contexts;

namespace ${ctx.solutionName}.DI.Extensions
{
    /// <summary>
    /// رجیستریشن Canonical سرویس‌ها
    /// </summary>
    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddApplicationServices(
            this IServiceCollection services,
            IConfiguration configuration
        )
        {
            // ------------------------------
            // DbContext
            // ------------------------------
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlServer(
                    configuration.GetConnectionString("DefaultConnection")
                )
            );

            // ------------------------------
            // Memory Cache
            // ------------------------------
            services.AddMemoryCache();

            // ------------------------------
            // Services & Repositories
            // ------------------------------
${registrations.map(r => `            ${r}`).join('\n')}

            // ------------------------------
            // AutoMapper
            // ------------------------------
            services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());

            return services;
        }
    }
}
`;

    fs.writeFileSync(filePath, content, 'utf8');
}
