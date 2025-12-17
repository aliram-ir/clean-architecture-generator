import * as fs from 'fs';
import * as path from 'path';
import { ProjectContext } from '../core/projectContext';

/*
|--------------------------------------------------------------------------
| BaseCacheService Generator (Canonical)
|--------------------------------------------------------------------------
| ✅ Single Source
| ✅ Non‑destructive
| ✅ Required by all Cached Services
*/

export function generateBaseCacheService(ctx: ProjectContext): void {

    const basePath = path.join(
        ctx.layers.application,
        'Services',
        'Base'
    );

    const filePath = path.join(basePath, 'BaseCacheService.cs');

    if (fs.existsSync(filePath))
        return;

    fs.mkdirSync(basePath, { recursive: true });

    fs.writeFileSync(
        filePath,
        `using Microsoft.Extensions.Caching.Memory;
using System;
using System.Text.Json;

namespace ${ctx.solutionName}.Application.Services.Base
{
    public abstract class BaseCacheService
    {
        protected readonly IMemoryCache _cache;
        protected readonly TimeSpan _defaultCacheDuration = TimeSpan.FromMinutes(5);

        protected BaseCacheService(IMemoryCache cache)
        {
            _cache = cache;
        }

        protected string BuildCacheKey(
            string methodName,
            params object?[] parameters
        )
        {
            var key = methodName;

            foreach (var param in parameters)
            {
                if (param == null)
                    continue;

                key += ":" + JsonSerializer.Serialize(param);
            }

            return key;
        }
    }
}
`,
        'utf8'
    );
}
