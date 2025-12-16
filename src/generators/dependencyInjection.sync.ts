import * as fs from 'fs';
import * as path from 'path';
import { ProjectContext } from '../core/projectContext';
import { writeIfMissing } from '../core/helpers';

/*
|--------------------------------------------------------------------------
| Dependency Injection Sync (FINAL – FIXED)
|--------------------------------------------------------------------------
| ✅ DI file ALWAYS created
| ✅ AutoMapper Assembly Scan
| ✅ IUnitOfWork from Application
| ✅ Repositories from Application.Interfaces.Repositories
| ✅ Services from Application.Interfaces.Services
| ✅ Fully Idempotent
*/

export function syncDependencyInjection(ctx: ProjectContext) {

    // ✅ DI layer MUST exist (created during solution creation)
    const diRoot = ctx.layers.di;
    if (!diRoot) return;

    const extensionsDir = path.join(diRoot, 'Extensions');
    const diFilePath = path.join(
        extensionsDir,
        'ServiceCollectionExtensions.cs'
    );

    fs.mkdirSync(extensionsDir, { recursive: true });

    // ✅ Always create file if missing
    writeIfMissing(diFilePath, diTemplate(ctx));

    let content = fs.readFileSync(diFilePath, 'utf8');

    content = syncAutoMapper(ctx, content);
    content = syncUnitOfWork(content);
    content = syncRepositories(ctx, content);
    content = syncServices(ctx, content);

    fs.writeFileSync(diFilePath, content, 'utf8');
}

/*
|--------------------------------------------------------------------------
| AutoMapper – Application Assembly Scan
|--------------------------------------------------------------------------
*/

function syncAutoMapper(ctx: ProjectContext, content: string) {

    if (content.includes('AddAutoMapper')) {
        return content;
    }

    const registration =
        `            services.AddAutoMapper(` +
        `typeof(${ctx.solutionName}.Application.Mappings.${ctx.solutionName}AutoMapperAnchor).Assembly);`;

    return insertOnce(
        content,
        '// === AutoMapper ===',
        registration
    );
}

/*
|--------------------------------------------------------------------------
| UnitOfWork
|--------------------------------------------------------------------------
| ✅ IUnitOfWork → Application
| ✅ UnitOfWork → Infrastructure
*/

function syncUnitOfWork(content: string) {

    const registration =
        `            services.AddScoped<IUnitOfWork, UnitOfWork>();`;

    return insertOnce(
        content,
        '// === UnitOfWork ===',
        registration
    );
}

/*
|--------------------------------------------------------------------------
| Repositories (Typed)
|--------------------------------------------------------------------------
| ✅ Interfaces from Application.Interfaces.Repositories
| ✅ Implementations from Infrastructure.Repositories
*/

function syncRepositories(ctx: ProjectContext, content: string) {

    const repoInterfacesDir = path.join(
        ctx.layers.application,
        'Interfaces',
        'Repositories'
    );

    const repoImplDir = path.join(
        ctx.layers.infrastructure,
        'Repositories'
    );

    if (!fs.existsSync(repoInterfacesDir) || !fs.existsSync(repoImplDir)) {
        return content;
    }

    const interfaces = fs.readdirSync(repoInterfacesDir)
        .filter(f => f.endsWith('Repository.cs') && f.startsWith('I'));

    for (const file of interfaces) {

        const iface = file.replace('.cs', '');
        const impl = iface.replace(/^I/, '');

        const registration =
            `            services.AddScoped<${iface}, ${impl}>();`;

        content = insertOnce(
            content,
            '// === Repositories ===',
            registration
        );
    }

    return content;
}

/*
|--------------------------------------------------------------------------
| Application Services
|--------------------------------------------------------------------------
*/

function syncServices(ctx: ProjectContext, content: string) {

    const servicesDir = path.join(
        ctx.layers.application,
        'Services'
    );

    if (!fs.existsSync(servicesDir)) {
        return content;
    }

    const services = fs.readdirSync(servicesDir)
        .filter(f => f.endsWith('Service.cs'));

    for (const file of services) {

        const service = file.replace('.cs', '');
        const iface = `I${service}`;

        const registration =
            `            services.AddScoped<${iface}, ${service}>();`;

        content = insertOnce(
            content,
            '// === Application Services ===',
            registration
        );
    }

    return content;
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function insertOnce(
    content: string,
    marker: string,
    line: string
): string {

    if (content.includes(line)) {
        return content;
    }

    return content.replace(
        marker,
        `${marker}\n${line}`
    );
}

/*
|--------------------------------------------------------------------------
| DI File Template
|--------------------------------------------------------------------------
*/

function diTemplate(ctx: ProjectContext): string {

    return `using Microsoft.Extensions.DependencyInjection;
using ${ctx.solutionName}.Application.Interfaces.Repositories;
using ${ctx.solutionName}.Application.Interfaces.Services;
using ${ctx.solutionName}.Infrastructure.Repositories;

namespace ${ctx.solutionName}.DI.Extensions
{
    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddProjectServices(
            this IServiceCollection services
        )
        {
            // === AutoMapper ===

            // === UnitOfWork ===

            // === Repositories ===

            // === Application Services ===

            return services;
        }
    }
}
`;
}
