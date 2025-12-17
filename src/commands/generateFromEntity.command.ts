import * as vscode from 'vscode';
import * as path from 'path';

import { resolveProjectContext } from '../core/resolver';
import { CommandIds } from './commandIds';

import { generateRepository } from '../generators/repository.generator';
import { generateDtos } from '../generators/dto.generator';
import { generateService } from '../generators/service.generator';
import { generateBaseCacheService } from '../generators/baseCacheService.generator';
import { generateAutoMapperProfile } from '../generators/automapper.generator';

import { syncUnitOfWork } from '../generators/unitOfWork.sync';
import { syncFluentConfigurations } from '../generators/fluentConfig.generator';
import { syncDbContext } from '../generators/dbContext.sync';
import { syncDependencyInjection } from '../generators/dependencyInjection.sync';

/*
|--------------------------------------------------------------------------
| Generate From Entity Command (CANONICAL – FINAL)
|--------------------------------------------------------------------------
| ✅ Complete Application Stack
| ✅ Golden‑Sample Driven (za)
| ✅ Idempotent
| ✅ No Missing Artifacts
*/

export function registerGenerateFromEntityCommand(): vscode.Disposable {

    return vscode.commands.registerCommand(
        CommandIds.GenerateFromEntity,
        generateFromEntityCommand
    );
}

/*
|--------------------------------------------------------------------------
| Command Handler
|--------------------------------------------------------------------------
*/

async function generateFromEntityCommand(uri: vscode.Uri) {

    try {

        if (!uri || !uri.fsPath.endsWith('.cs'))
            return;

        const filePath = uri.fsPath;
        const entity = path.basename(filePath, '.cs');

        const ctx = resolveProjectContext(filePath);
        if (!ctx) {
            vscode.window.showErrorMessage('❌ Unable to resolve project context');
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Canonical Generation Flow (LOCKED)
        |--------------------------------------------------------------------------
        */

        generateRepository(ctx, entity);

        syncUnitOfWork(ctx, entity);

        generateDtos(ctx, entity, filePath);

        // ✅ REQUIRED INFRA
        generateBaseCacheService(ctx);

        generateService(ctx, entity);

        // ✅ AutoMapper Profile (WAS MISSING)
        generateAutoMapperProfile(ctx, entity);

        syncFluentConfigurations(ctx);
        syncDbContext(ctx, entity);
        syncDependencyInjection(ctx);

        vscode.window.showInformationMessage(
            `✅ Entity '${entity}' fully synchronized`
        );
    }
    catch (error: any) {
        vscode.window.showErrorMessage(
            `❌ Generate failed: ${error?.message ?? error}`
        );
    }
}
