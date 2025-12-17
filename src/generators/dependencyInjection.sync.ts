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
| Dependency Injection Sync (Canonical – Locked)
|--------------------------------------------------------------------------
| ✅ Interface‑driven
| ✅ Fail‑safe
| ✅ Deterministic
| ✅ Overwrite by design
| ✅ NO blind registrations
*/

export function syncDependencyInjection(
    ctx: ProjectContext
): void {

    const applicationPath = ctx.layers.application;
    const infrastructurePath = ctx.layers.infrastructure;
    const diPath = ctx.layers.di;

    if (!applicationPath || !infrastructurePath || !diPath) {
        throw new Error('DI Sync failed: Missing required layers');
    }

    const extensionsPath = path.join(diPath, 'Extensions');
    const filePath = path.join(
        extensionsPath,
        'ServiceCollectionExtensions.cs'
    );

    fs.mkdirSync(extensionsPath, { recursive: true });

    // ----------------------------------------------------------
    // ✅ Pure filesystem scans (SSOT)
    // ----------------------------------------------------------

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

        if (!iface)
            continue;

        registrations.push(
            `services.AddScoped<${iface.namespace}.${iface.name}, ${svc.namespace}.${svc.name}>();`
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Infrastructure Repositories (STRICT)
    |--------------------------------------------------------------------------
    | ✅ Only if matching Application Interface exists
    | ✅ Excludes Base Repository
    |--------------------------------------------------------------------------
    */
    const repoInterfacesPath = path.join(
        applicationPath,
        'Interfaces',
        'Repositories'
    );

    const repoInterfaceFiles = fs.existsSync(repoInterfacesPath)
        ? fs.readdirSync(repoInterfacesPath)
            .filter(f => f.endsWith('.cs'))
            .map(f => path.basename(f, '.cs'))
        : [];

    for (const repo of repositories) {

        // ❌ Base repository must never be registered
        if (repo.name === 'Repository')
            continue;

        // UserRepository → IUserRepository
        const expectedInterfaceName =
            `I${repo.name.replace('Repository', '')}Repository`;

        if (!repoInterfaceFiles.includes(expectedInterfaceName))
            continue; // ✅ FAIL‑SAFE

        const ifaceNamespace =
            `${ctx.solutionName}.Application.Interfaces.Repositories`;

        registrations.push(
            `services.AddScoped<${ifaceNamespace}.${expectedInterfaceName}, ${repo.namespace}.${repo.name}>();`
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Unit Of Work (Single Source)
    |--------------------------------------------------------------------------
    */
    registrations.push(
        `services.AddScoped<${ctx.solutionName}.Application.Interfaces.Persistence.IUnitOfWork, ${ctx.solutionName}.Infrastructure.Persistence.UnitOfWork>();`
    );

    // ----------------------------------------------------------
    // ✅ Deterministic Composition Root
    // ----------------------------------------------------------

    const content = `using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;

using ${ctx.solutionName}.Infrastructure.Persistence.Contexts;

namespace ${ctx.solutionName}.DI.Extensions
{
    /// <summary>
    /// Canonical DI Composition Root
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
