import * as path from 'path';
import * as fs from 'fs';

import { ProjectContext } from '../core/projectContext';
import { writeIfMissing } from '../infrastructure/fileSystem';
import { pluralize } from '../infrastructure/stringUtils';

/*
|--------------------------------------------------------------------------
| AutoMapper Profile Generator
|--------------------------------------------------------------------------
*/

export function generateAutoMapper(ctx: ProjectContext, entity: string) {

    const mapPath = path.join(ctx.layers.application, 'Mappings');
    fs.mkdirSync(mapPath, { recursive: true });

    writeIfMissing(
        path.join(mapPath, `${entity}Profile.cs`),
        `using AutoMapper;
using ${ctx.solutionName}.Domain.Entities;
using ${ctx.solutionName}.Application.DTOs.${pluralize(entity)};

namespace ${ctx.solutionName}.Application.Mappings
{
    public class ${entity}Profile : Profile
    {
        public ${entity}Profile()
        {
            CreateMap<${entity}, ${entity}Dto>().ReverseMap();
            CreateMap<Create${entity}Dto, ${entity}>();
            CreateMap<Update${entity}Dto, ${entity}>();
        }
    }
}`
    );
}
