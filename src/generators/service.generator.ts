import * as path from 'path';
import { ProjectContext } from '../core/projectContext';
// ✅ توابع pluralize و writeIfMissing از helpers.ts ایمپورت می‌شوند.
// ✅ تابع toPascalCase به صورت محلی تعریف شد تا خطای ایمپورت رفع شود.
import { pluralize, writeIfMissing } from '../core/helpers';

/*
|--------------------------------------------------------------------------
| Utils
|--------------------------------------------------------------------------
| توابع کمکی محلی برای این ژنراتور.
*/
function toPascalCase(name: string): string {
    return name
        .replace(/[-_ ]+(.)/g, (_, c) => c.toUpperCase())
        .replace(/^(.)/, c => c.toUpperCase());
}

/*
|--------------------------------------------------------------------------
| Advanced Typed Service Generator
|--------------------------------------------------------------------------
| ✅ تولید Service با Typed UnitOfWork (برای Entities مانند Products, Orders, ...)
| ✅ استفاده از BaseCacheService
| ✅ استفاده از AutoMapper برای نگاشت DTO به Entity و بالعکس
| ✅ استفاده از CancellationToken در تمامی متدهای Asynchronous
*/

export function generateService(
    ctx: ProjectContext,
    entity: string
) {
    // ✅ تبدیل نام Entity به فرمت PascalCase با استفاده از تابع محلی
    const entityName = toPascalCase(entity);
    // ✅ تبدیل نام Entity به حالت جمع برای استفاده در DTOs Namespace
    const plural = pluralize(entityName);

    const applicationRoot = ctx.layers.application;

    // ✅ مسیر فایل اینترفیس سرویس (I{Entity}Service.cs)
    const interfacePath = path.join(
        applicationRoot,
        'Interfaces',
        'Services',
        `I${entityName}Service.cs`
    );

    // ✅ مسیر فایل پیاده‌سازی سرویس ({Entity}Service.cs)
    const servicePath = path.join(
        applicationRoot,
        'Services',
        `${entityName}Service.cs`
    );

    // --------------------------------------------------
    // Service Interface Generation
    // --------------------------------------------------
    // ✅ اطمینان از وجود فایل اینترفیس و ایجاد آن در صورت عدم وجود
    writeIfMissing(
        interfacePath,
        `using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using ${ctx.solutionName}.Application.DTOs.${plural}; // ✅ فضای نام صحیح DTOs

namespace ${ctx.solutionName}.Application.Interfaces.Services
{
    // ✅ اینترفیس سرویس برای مدیریت عملیات CRUD بر روی Entity
    public interface I${entityName}Service
    {
        Task<${entityName}Dto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<List<${entityName}Dto>> GetAllAsync(CancellationToken cancellationToken = default);
        Task<${entityName}Dto> CreateAsync(Create${entityName}Dto dto, CancellationToken cancellationToken = default);
        Task<${entityName}Dto?> UpdateAsync(Guid id, Update${entityName}Dto dto, CancellationToken cancellationToken = default);
        Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    }
}
`
    );

    // --------------------------------------------------
    // Service Implementation (Typed UoW + Cache)
    // --------------------------------------------------
    // ✅ اطمینان از وجود فایل پیاده‌سازی سرویس و ایجاد آن در صورت عدم وجود
    writeIfMissing(
        servicePath,
        `using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.Extensions.Caching.Memory;
using ${ctx.solutionName}.Application.DTOs.${plural}; // ✅ فضای نام صحیح DTOs
using ${ctx.solutionName}.Application.Interfaces.Base; // ✅ IUnitOfWork از Application.Interfaces.Base
using ${ctx.solutionName}.Application.Interfaces.Services;
using ${ctx.solutionName}.Application.Services.Base; // ✅ BaseCacheService
using ${ctx.solutionName}.Domain.Entities; // ✅ ارجاع به Entity برای عملیات نگاشت

namespace ${ctx.solutionName}.Application.Services
{
    // ✅ پیاده‌سازی سرویس که از BaseCacheService ارث‌بری می‌کند و اینترفیس سرویس را پیاده‌سازی می‌نماید
    public class ${entityName}Service
        : BaseCacheService, I${entityName}Service
    {
        private readonly IUnitOfWork _unitOfWork; // ✅ وابستگی به UnitOfWork
        private readonly IMapper _mapper;         // ✅ وابستگی به AutoMapper

        // ✅ سازنده سرویس با تزریق وابستگی‌های UnitOfWork, AutoMapper و IMemoryCache
        public ${entityName}Service(
            IUnitOfWork unitOfWork,
            IMapper mapper,
            IMemoryCache cache
        ) : base(cache) // ✅ فراخوانی سازنده کلاس پایه BaseCacheService
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        // ✅ متد دریافت Entity بر اساس شناسه، با قابلیت کشینگ و Cancellation Token
        public async Task<${entityName}Dto?> GetByIdAsync(
            Guid id,
            CancellationToken cancellationToken = default
        )
        {
            var cacheKey = BuildCacheKey(nameof(GetByIdAsync), id);

            if (_cache.TryGetValue(cacheKey, out ${entityName}Dto cached))
                return cached;

            var entity = await _unitOfWork.${plural} // ✅ دسترسی به Repository تایپ‌شده از طریق UnitOfWork
                .GetByIdAsync(id, cancellationToken);

            if (entity == null)
                return null;

            var dto = _mapper.Map<${entityName}Dto>(entity);
            _cache.Set(cacheKey, dto, _defaultCacheDuration); // ✅ ذخیره نتیجه در کش

            return dto;
        }

        // ✅ متد دریافت تمامی Entities، با قابلیت کشینگ و Cancellation Token
        public async Task<List<${entityName}Dto>> GetAllAsync(
            CancellationToken cancellationToken = default
        )
        {
            var cacheKey = BuildCacheKey(nameof(GetAllAsync));

            if (_cache.TryGetValue(cacheKey, out List<${entityName}Dto> cached))
                return cached;

            var entities = await _unitOfWork.${plural} // ✅ دسترسی به Repository تایپ‌شده از طریق UnitOfWork
                .GetAllAsync(cancellationToken);

            var dtos = _mapper.Map<List<${entityName}Dto>>(entities);
            _cache.Set(cacheKey, dtos, _defaultCacheDuration); // ✅ ذخیره نتیجه در کش

            return dtos;
        }

        // ✅ متد ایجاد Entity جدید، با نگاشت از DTO و Cancellation Token
        public async Task<${entityName}Dto> CreateAsync(
            Create${entityName}Dto dto,
            CancellationToken cancellationToken = default
        )
        {
            var entity = _mapper.Map<${entityName}>(dto); // ✅ نگاشت DTO به Entity

            await _unitOfWork.${plural} // ✅ افزودن Entity جدید از طریق Repository
                .AddAsync(entity, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken); // ✅ ذخیره تغییرات
            _cache.Remove(BuildCacheKey(nameof(GetAllAsync))); // ✅ پاک کردن کش GetAll

            return _mapper.Map<${entityName}Dto>(entity);
        }

        // ✅ متد به‌روزرسانی Entity موجود، با نگاشت از DTO و Cancellation Token
        public async Task<${entityName}Dto?> UpdateAsync(
            Guid id,
            Update${entityName}Dto dto,
            CancellationToken cancellationToken = default
        )
        {
            var entity = await _unitOfWork.${plural} // ✅ دریافت Entity موجود
                .GetByIdAsync(id, cancellationToken);

            if (entity == null)
                return null;

            _mapper.Map(dto, entity); // ✅ نگاشت تغییرات DTO به Entity موجود

            _unitOfWork.${plural}.Update(entity); // ✅ به‌روزرسانی Entity
            await _unitOfWork.SaveChangesAsync(cancellationToken); // ✅ ذخیره تغییرات

            _cache.Remove(BuildCacheKey(nameof(GetAllAsync))); // ✅ پاک کردن کش GetAll
            _cache.Remove(BuildCacheKey(nameof(GetByIdAsync), id)); // ✅ پاک کردن کش GetById

            return _mapper.Map<${entityName}Dto>(entity);
        }

        // ✅ متد حذف Entity، با Cancellation Token
        public async Task<bool> DeleteAsync(
            Guid id,
            CancellationToken cancellationToken = default
        )
        {
            var entity = await _unitOfWork.${plural} // ✅ دریافت Entity موجود
                .GetByIdAsync(id, cancellationToken);

            if (entity == null)
                return false;

            _unitOfWork.${plural}.Delete(entity); // ✅ حذف Entity
            await _unitOfWork.SaveChangesAsync(cancellationToken); // ✅ ذخیره تغییرات

            _cache.Remove(BuildCacheKey(nameof(GetAllAsync))); // ✅ پاک کردن کش GetAll
            _cache.Remove(BuildCacheKey(nameof(GetByIdAsync), id)); // ✅ پاک کردن کش GetById

            return true;
        }
    }
}
`
    );
}
