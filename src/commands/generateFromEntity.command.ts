import * as vscode from 'vscode';
import * as path from 'path';

import { resolveProjectContext } from '../core/resolver';
import { CommandIds } from './commandIds';

import { generateRepository } from '../generators/repository.generator';
import { generateDtos } from '../generators/dto.generator';
import { generateService } from '../generators/service.generator';
import { syncUnitOfWork } from '../generators/unitOfWork.sync';
import { syncFluentConfigurations } from '../generators/fluentConfig.generator';
import { syncDbContext } from '../generators/dbContext.sync';
import { syncDependencyInjection } from '../generators/dependencyInjection.sync';

/*
|--------------------------------------------------------------------------
| Generate From Entity Command (Canonical)
|--------------------------------------------------------------------------
| ✅ Whole‑stack Application sync from Entity
| ✅ Idempotent
| ✅ Context‑only architecture
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
| ✅ Trigger: Right click on Entity (.cs)
| ✅ FILE path passed to resolver
*/

async function generateFromEntityCommand(uri: vscode.Uri) {

    try {

        if (!uri || !uri.fsPath.endsWith('.cs'))
            return;

        const filePath = uri.fsPath;

        // ------------------------------
        // ✅ Resolve Project Context
        // ------------------------------
        const ctx = resolveProjectContext(filePath);
        if (!ctx) {
            vscode.window.showErrorMessage(
                '❌ Unable to resolve project context'
            );
            return;
        }

        // ------------------------------
        // ✅ Entity Name
        // ------------------------------
        const entity = path.basename(filePath, '.cs');

        /*
        |--------------------------------------------------------------------------
        | Canonical Generation Flow
        |--------------------------------------------------------------------------
        | 1. Repository
        | 2. UnitOfWork (Global / Once)
        | 3. DTOs
        | 4. Service
        | 5. Fluent Config (Global Sync)
        | 6. DbContext Sync
        | 7. Dependency Injection
        */

        generateRepository(ctx, entity);

        // ✅ Non‑Entity based (Canonical)
        syncUnitOfWork(ctx);

        generateDtos(ctx, entity, filePath);
        generateService(ctx, entity);

        // ✅ Global Fluent Config sync
        syncFluentConfigurations(ctx);

        // ✅ DbContext safety sync
        syncDbContext(ctx, entity);

        // ✅ DI final sync
        syncDependencyInjection(ctx);

        vscode.window.showInformationMessage(
            `✅ Entity '${entity}' synchronized successfully`
        );
    }
    catch (error: any) {

        vscode.window.showErrorMessage(
            `❌ Generate failed: ${error?.message ?? error}`
        );
    }
}
