import * as fs from 'fs';
import * as path from 'path';
import { ProjectContext } from '../core/projectContext';

export function generateBaseCacheService(
    ctx: ProjectContext
): void {

    const servicesBasePath = path.join(
        ctx.layers.application,
        'Services',
        'Base'
    );

    const filePath = path.join(
        servicesBasePath,
        'BaseCacheService.cs'
    );

    if (fs.existsSync(filePath))
        return;

    fs.mkdirSync(servicesBasePath, { recursive: true });

    const content = `using System;
using Microsoft.Extensions.Caching.Memory;

namespace ${ctx.solutionName}.Application.Services.Base
{
    /// <summary>
    /// Base class for cached application services
    /// </summary>
    public abstract class BaseCacheService
    {
        protected readonly IMemoryCache _cache;

        // ✅ Default cache duration (5 minutes)
        protected readonly TimeSpan _defaultCacheDuration =
            TimeSpan.FromMinutes(5);

        protected BaseCacheService(IMemoryCache cache)
        {
            _cache = cache;
        }

        protected string BuildCacheKey(
            string methodName,
            params object[] parameters
        )
        {
            return $"{GetType().Name}:{methodName}:{string.Join(":", parameters)}";
        }

        protected void InvalidateCache(
            string methodName,
            params object[] parameters
        )
        {
            _cache.Remove(BuildCacheKey(methodName, parameters));
        }
    }
}
`;

    fs.writeFileSync(filePath, content, 'utf8');
}
