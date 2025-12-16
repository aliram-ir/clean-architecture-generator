import * as fs from 'fs';
import * as path from 'path';

import { ProjectContext } from '../core/projectContext';
import { controllerTemplate } from '../templates/controller.template';

/*
|--------------------------------------------------------------------------
| API Controller Generator
|--------------------------------------------------------------------------
*/

export function generateApiController(ctx: ProjectContext, entity: string) {

    if (!ctx.layers.api) return;

    const controllerDir = path.join(ctx.layers.api, 'Controllers');
    fs.mkdirSync(controllerDir, { recursive: true });

    const filePath = path.join(controllerDir, `${entity}Controller.cs`);
    if (fs.existsSync(filePath)) return;

    fs.writeFileSync(
        filePath,
        controllerTemplate(ctx.solutionName, entity)
    );
}
