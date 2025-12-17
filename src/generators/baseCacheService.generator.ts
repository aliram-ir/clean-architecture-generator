import * as fs from 'fs';
import * as path from 'path';
import { ProjectContext } from '../core/projectContext';

/*
|--------------------------------------------------------------------------
| BaseCacheService Generator (Canonical)
|--------------------------------------------------------------------------
| ✅ Abstract
| ✅ IMemoryCache
| ✅ Application Layer
| ✅ Uses ctx.layers.application
*/

export function generateBaseCacheService(
    ctx: ProjectContext
): void {

    const applicationPath = ctx.layers.application;
    if (!applicationPath) {
        throw new Error('Application layer not found');
    }

    const servicesPath = path.join(
        applicationPath,
        'Services',
        'Base'
    );

    const filePath = path.join(
        servicesPath,
        'BaseCacheService.cs'
    );

    // ✅ Non-destructive generation
    if (fs.existsSync(filePath))
        return;

    fs.mkdirSync(servicesPath, { recursive: true });

    const content = `using System;
using Microsoft.Extensions.Caching.Memory;

namespace ${ctx.solutionName}.Application.Services.Base
{
    /// <summary>
    /// کلاس پایه برای سرویس‌های دارای Cache
    /// </summary>
    public abstract class BaseCacheService
    {
        protected readonly IMemoryCache Cache;

        protected BaseCacheService(IMemoryCache cache)
        {
            Cache = cache;
        }

        /// <summary>
        /// دریافت داده از Cache یا ساخت آن
        /// </summary>
        protected T GetOrCreate<T>(
            string key,
            Func<T> factory,
            int minutes = 5
        )
        {
            return Cache.GetOrCreate(key, entry =>
            {
                entry.AbsoluteExpirationRelativeToNow =
                    TimeSpan.FromMinutes(minutes);

                return factory();
            })!;
        }

        /// <summary>
        /// حذف یک کلید از Cache
        /// </summary>
        protected void Remove(string key)
        {
            Cache.Remove(key);
        }
    }
}
`;

    fs.writeFileSync(filePath, content, 'utf8');
}
