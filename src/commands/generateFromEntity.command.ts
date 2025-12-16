// clean-architecture-generator-master/src/commands/generateFromEntity.command.ts
import * as vscode from 'vscode';
import * as path from 'path';

import { resolveProjectContext } from '../core/resolver';
import { generateRepository } from '../generators/repository.generator';
import { syncUnitOfWork } from '../generators/unitOfWork.sync';
import { generateDtos } from '../generators/dto.generator';
import { generateService } from '../generators/service.generator';
import { generateAutoMapper } from '../generators/automapper.generator';
import { generateFluentConfiguration } from '../generators/fluentConfig.generator';
import { syncDbContext } from '../generators/dbContext.sync';
import { syncDependencyInjection } from '../generators/dependencyInjection.sync';

/*
|--------------------------------------------------------------------------
| Generate From Entity Command
|--------------------------------------------------------------------------
| ✅ Fluent Configuration همیشه ساخته می‌شود
| ✅ DbContext همیشه Sync می‌شود
| ✅ UnitOfWork فقط یک‌بار و Canonical ساخته می‌شود
| ✅ Idempotent
*/

export function registerGenerateFromEntityCommand() {

    return vscode.commands.registerCommand(
        'cleanArch.generateFromEntity',
        async (uri: vscode.Uri) => {

            if (!uri || !uri.fsPath.endsWith('.cs')) return;

            // نام Entity از روی فایل انتخاب‌شده
            const entity = path.basename(uri.fsPath, '.cs');

            // Resolve Project Context
            const ctx = resolveProjectContext(uri.fsPath);
            if (!ctx) {
                vscode.window.showErrorMessage('❌ Unable to resolve project context');
                return;
            }

            const config = vscode.workspace.getConfiguration('cleanArchitectureGenerator');
            const useMapper = config.get<boolean>('useAutoMapper') ?? true;
            const useAutoDI = config.get<boolean>('useAutoDI') ?? true;

            // ----------------------------------
            // ✅ Core Generation
            // ----------------------------------
            generateRepository(ctx, entity);

            // ✅ UnitOfWork: Canonical & Non-Entity-Based
            syncUnitOfWork(ctx);

            generateDtos(ctx, entity, uri.fsPath);
            generateService(ctx, entity);

            // ----------------------------------
            // ✅ Mandatory Synchronization
            // ----------------------------------
            generateFluentConfiguration(ctx, entity);
            syncDbContext(ctx, entity);

            if (useMapper) {
                generateAutoMapper(ctx, entity);
            }

            if (useAutoDI) {
                syncDependencyInjection(ctx);
            }

            vscode.window.showInformationMessage(
                `✅ ${entity} stack synchronized successfully`
            );
        }
    );
}
