import * as fs from 'fs';
import * as path from 'path';
import { ProjectContext } from '../core/projectContext';
import { writeIfMissing } from '../core/helpers';

/*
|--------------------------------------------------------------------------
| Dependency Injection Sync
|--------------------------------------------------------------------------
| ✅ AutoMapper Profile Auto Scan
| ✅ Typed UnitOfWork
| ✅ Typed Repositories
| ✅ Application Services
| ✅ Non-destructive & Idempotent
*/

export function syncDependencyInjection(ctx: ProjectContext) {

    const diRoot =
        ctx.layers.di ??
        path.join(ctx.rootPath, `${ctx.solutionName}.DI`);

    const extensionsDir = path.join(diRoot, 'Extensions');
    const diFilePath = path.join(
        extensionsDir,
        'ServiceCollectionExtensions.cs'
    );

    fs.mkdirSync(extensionsDir, { recursive: true });

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
| AutoMapper Auto Scan
|--------------------------------------------------------------------------
| ✅ Scans Application assembly
| ✅ Detects all Profile classes automatically
*/

function syncAutoMapper(ctx: ProjectContext, content: string) {

    const using = `using AutoMapper;`;
    if (!content.includes(using)) {
        content = using + '\n' + content;
    }

    const registration =
        `            services.AddAutoMapper(` +
        `typeof(${ctx.solutionName}.Application.Mappings.${ctx.solutionName}AutoMapperAnchor).Assembly);`;

    if (content.includes('AddAutoMapper(')) {
        return content;
    }

    return content.replace(
        '// === AutoMapper ===',
        `// === AutoMapper ===\n${registration}`
    );
}

/*
|--------------------------------------------------------------------------
| UnitOfWork
|--------------------------------------------------------------------------
*/

function syncUnitOfWork(content: string) {

    const registration =
        `            services.AddScoped<IUnitOfWork, UnitOfWork>();`;

    if (content.includes(registration.trim())) {
        return content;
    }

    return content.replace(
        '// === UnitOfWork ===',
        `// === UnitOfWork ===\n${registration}`
    );
}

/*
|--------------------------------------------------------------------------
| Repositories (Typed)
|--------------------------------------------------------------------------
*/

function syncRepositories(ctx: ProjectContext, content: string) {

    const repoInterfacesDir = path.join(
        ctx.layers.domain,
        'Interfaces'
    );

    const repoImplDir = path.join(
        ctx.layers.infrastructure,
        'Repositories'
    );

    if (!fs.existsSync(repoInterfacesDir) || !fs.existsSync(repoImplDir)) {
        return content;
    }

    const interfaces = fs.readdirSync(repoInterfacesDir)
        .filter(f => f.endsWith('Repository.cs'));

    for (const file of interfaces) {

        const iface = file.replace('.cs', '');
        const impl = iface.replace(/^I/, '');

        const registration =
            `            services.AddScoped<${iface}, ${impl}>();`;

        if (!content.includes(registration.trim())) {
            content = content.replace(
                '// === Repositories ===',
                `// === Repositories ===\n${registration}`
            );
        }
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

        if (!content.includes(registration.trim())) {
            content = content.replace(
                '// === Application Services ===',
                `// === Application Services ===\n${registration}`
            );
        }
    }

    return content;
}

/*
|--------------------------------------------------------------------------
| DI File Template
|--------------------------------------------------------------------------
*/

function diTemplate(ctx: ProjectContext): string {

    return `using Microsoft.Extensions.DependencyInjection;
using ${ctx.solutionName}.Application.Interfaces.Services;
using ${ctx.solutionName}.Domain.Interfaces;
using ${ctx.solutionName}.Infrastructure.Repositories;
using ${ctx.solutionName}.Infrastructure.Repositories.Base;

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
