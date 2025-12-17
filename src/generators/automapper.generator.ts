import * as fs from 'fs';
import * as path from 'path';
import { ProjectContext } from '../core/projectContext';

/*
|--------------------------------------------------------------------------
| AutoMapper Profile Generator (Canonical)
|--------------------------------------------------------------------------
| ✅ One profile per entity
| ✅ DTO <-> Entity
| ✅ Create / Update DTO support
*/

export function generateAutoMapperProfile(
    ctx: ProjectContext,
    entity: string
): void {

    const mappingsPath = path.join(
        ctx.layers.application,
        'Mappings'
    );

    const filePath = path.join(
        mappingsPath,
        `${entity}Profile.cs`
    );

    if (fs.existsSync(filePath))
        return;

    fs.mkdirSync(mappingsPath, { recursive: true });

    const content = `using AutoMapper;
using ${ctx.solutionName}.Domain.Entities;
using ${ctx.solutionName}.Application.DTOs.${entity}s;

namespace ${ctx.solutionName}.Application.Mappings
{
    /// <summary>
    /// AutoMapper profile for ${entity}
    /// </summary>
    public sealed class ${entity}Profile : Profile
    {
        public ${entity}Profile()
        {
            // ✅ Entity -> DTO
            CreateMap<${entity}, ${entity}Dto>().ReverseMap();

            // ✅ Create DTO -> Entity
            CreateMap<Create${entity}Dto, ${entity}>();

            // ✅ Update DTO -> Entity
            CreateMap<Update${entity}Dto, ${entity}>();
        }
    }
}
`;

    fs.writeFileSync(filePath, content, 'utf8');
}
