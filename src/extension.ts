import * as vscode from 'vscode';

import { registerCreateSolutionCommand } from './commands/createSolution.command';
import { registerGenerateFromEntityCommand } from './commands/generateFromEntity.command';
import { registerGenerateControllerCommand } from './commands/generateController.command';

export function activate(context: vscode.ExtensionContext): void {

	context.subscriptions.push(
		registerCreateSolutionCommand(),
		registerGenerateFromEntityCommand(),
		registerGenerateControllerCommand()
	);

	vscode.window.showInformationMessage(
		'✅ Clean Architecture Generator activated'
	);
}

export function deactivate(): void { }
