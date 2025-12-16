import * as path from 'path';
import { ProjectContext } from '../core/projectContext';
import { pluralize, writeIfMissing } from '../core/helpers';

/*
|--------------------------------------------------------------------------
| Utils
|--------------------------------------------------------------------------
| Local PascalCase (helpers.ts ندارد)
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
| ✅ Typed UnitOfWork (Products, Orders, ...)
| ✅ BaseCacheService
| ✅ AutoMapper
| ✅ CancellationToken everywhere
*/

export function generateService(
    ctx: ProjectContext,
    entity: string
) {
    const entityName = toPascalCase(entity);
    const plural = pluralize(entityName);

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
    // Service Interface
    // --------------------------------------------------
    writeIfMissing(
        interfacePath,
        `using ${ctx.solutionName}.Application.DTOs;

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
    // Service Implementation (Typed UoW + Cache)
    // --------------------------------------------------
    writeIfMissing(
        servicePath,
        `using AutoMapper;
using Microsoft.Extensions.Caching.Memory;
using ${ctx.solutionName}.Application.DTOs;
using ${ctx.solutionName}.Application.Interfaces.Persistence;
using ${ctx.solutionName}.Application.Interfaces.Services;
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

        public async Task<${entityName}Dto?> GetByIdAsync(
            Guid id,
            CancellationToken cancellationToken = default
        )
        {
            var cacheKey = BuildCacheKey(nameof(GetByIdAsync), id);

            if (_cache.TryGetValue(cacheKey, out ${entityName}Dto cached))
                return cached;

            var entity = await _unitOfWork.${plural}
                .GetByIdAsync(id, cancellationToken);

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

            if (_cache.TryGetValue(cacheKey, out List<${entityName}Dto> cached))
                return cached;

            var entities = await _unitOfWork.${plural}
                .GetAllAsync(cancellationToken);

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

            await _unitOfWork.${plural}
                .AddAsync(entity, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            _cache.Remove(BuildCacheKey(nameof(GetAllAsync)));

            return _mapper.Map<${entityName}Dto>(entity);
        }

        public async Task<${entityName}Dto?> UpdateAsync(
            Guid id,
            Update${entityName}Dto dto,
            CancellationToken cancellationToken = default
        )
        {
            var entity = await _unitOfWork.${plural}
                .GetByIdAsync(id, cancellationToken);

            if (entity == null)
                return null;

            _mapper.Map(dto, entity);

            _unitOfWork.${plural}.Update(entity);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            _cache.Remove(BuildCacheKey(nameof(GetAllAsync)));
            _cache.Remove(BuildCacheKey(nameof(GetByIdAsync), id));

            return _mapper.Map<${entityName}Dto>(entity);
        }

        public async Task<bool> DeleteAsync(
            Guid id,
            CancellationToken cancellationToken = default
        )
        {
            var entity = await _unitOfWork.${plural}
                .GetByIdAsync(id, cancellationToken);

            if (entity == null)
                return false;

            _unitOfWork.${plural}.Delete(entity);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            _cache.Remove(BuildCacheKey(nameof(GetAllAsync)));
            _cache.Remove(BuildCacheKey(nameof(GetByIdAsync), id));

            return true;
        }
    }
}
`
    );
}
