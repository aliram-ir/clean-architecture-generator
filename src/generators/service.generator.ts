import * as path from 'path';
import { ProjectContext } from '../core/projectContext';
import { pluralize, writeIfMissing } from '../core/helpers';


function toPascalCase(name: string): string {
    return name
        .replace(/[-_ ]+(.)/g, (_, c) => c.toUpperCase())
        .replace(/^(.)/, c => c.toUpperCase());
}


export function generateService(
    ctx: ProjectContext,
    entity: string
): void {

    const entityName = toPascalCase(entity);              // User
    const plural = pluralize(entityName);                 // Users
    const dtoNamespace = plural.toLowerCase();            // users ✅
    const repoProperty = plural;                          // Users (UoW)

    const applicationRoot = ctx.layers.application;

    const interfacePath = path.join(
        applicationRoot,
        'Interfaces',
        'Services',
        `I${entityName}Service.cs`
    );

    const servicePath = path.join(
        applicationRoot,
        'Services',
        `${entityName}Service.cs`
    );

    // --------------------------------------------------
    // Interface
    // --------------------------------------------------

    writeIfMissing(
        interfacePath,
        `using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using ${ctx.solutionName}.Application.DTOs.${dtoNamespace};

namespace ${ctx.solutionName}.Application.Interfaces.Services
{
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
    // Implementation
    // --------------------------------------------------

    writeIfMissing(
        servicePath,
        `using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.Extensions.Caching.Memory;
using ${ctx.solutionName}.Application.DTOs.${dtoNamespace}; // ✅ lowercase
using ${ctx.solutionName}.Application.Interfaces.Services;
using ${ctx.solutionName}.Application.Interfaces.Persistence; // ✅ CORRECT
using ${ctx.solutionName}.Application.Services.Base;
using ${ctx.solutionName}.Domain.Entities;

namespace ${ctx.solutionName}.Application.Services
{
    public class ${entityName}Service
        : BaseCacheService, I${entityName}Service
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public ${entityName}Service(
            IUnitOfWork unitOfWork,
            IMapper mapper,
            IMemoryCache cache
        ) : base(cache)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        // ✅ پاک‌سازی کش‌ها (GetAll + optional GetById)
        private void InvalidateCache(Guid? id = null)
        {
            _cache.Remove(BuildCacheKey(nameof(GetAllAsync)));

            if (id.HasValue)
                _cache.Remove(BuildCacheKey(nameof(GetByIdAsync), id.Value));
        }

        public async Task<${entityName}Dto?> GetByIdAsync(
            Guid id,
            CancellationToken cancellationToken = default
        )
        {
            var cacheKey = BuildCacheKey(nameof(GetByIdAsync), id);

            if (_cache.TryGetValue(cacheKey, out ${entityName}Dto? cached))
                return cached;

            var entity = await _unitOfWork.${repoProperty}
                .GetByIdAsync(id, cancellationToken: cancellationToken);

            if (entity == null)
                return null;

            var dto = _mapper.Map<${entityName}Dto>(entity);
            _cache.Set(cacheKey, dto, _defaultCacheDuration);

            return dto;
        }

        public async Task<List<${entityName}Dto>> GetAllAsync(
            CancellationToken cancellationToken = default
        )
        {
            var cacheKey = BuildCacheKey(nameof(GetAllAsync));
            
            // --- اصلاح: کش باید null‑safe باشد ---
            if (_cache.TryGetValue(cacheKey, out List<${entityName}Dto>? cached))
                return cached ?? new List<${entityName}Dto>();

            var entities = await _unitOfWork.${repoProperty}
                .GetAllAsync(null, null, true, cancellationToken);

            var dtos = _mapper.Map<List<${entityName}Dto>>(entities);
            _cache.Set(cacheKey, dtos, _defaultCacheDuration);

            return dtos;
        }

        public async Task<${entityName}Dto> CreateAsync(
            Create${entityName}Dto dto,
            CancellationToken cancellationToken = default
        )
        {
            var entity = _mapper.Map<${entityName}>(dto);

            await _unitOfWork.${repoProperty}
                .AddAsync(entity, cancellationToken: cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken: cancellationToken);

            InvalidateCache();

            return _mapper.Map<${entityName}Dto>(entity);
        }

        public async Task<${entityName}Dto?> UpdateAsync(
            Guid id,
            Update${entityName}Dto dto,
            CancellationToken cancellationToken = default
        )
        {
            var entity = await _unitOfWork.${repoProperty}
                .GetByIdAsync(id, cancellationToken: cancellationToken);

            if (entity == null)
                return null;

            _mapper.Map(dto, entity);
            await _unitOfWork.SaveChangesAsync(cancellationToken: cancellationToken);

            InvalidateCache(id);

            return _mapper.Map<${entityName}Dto>(entity);
        }

        public async Task<bool> DeleteAsync(
            Guid id,
            CancellationToken cancellationToken = default
        )
        {
            var entity = await _unitOfWork.${repoProperty}
                .GetByIdAsync(id, cancellationToken: cancellationToken);

            if (entity == null)
                return false;

            _unitOfWork.${repoProperty}.Remove(entity);
            await _unitOfWork.SaveChangesAsync(cancellationToken: cancellationToken);

            InvalidateCache(id);

            return true;
        }
    }
}
`
    );
}
