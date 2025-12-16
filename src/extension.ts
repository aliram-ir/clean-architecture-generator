import * as vscode from 'vscode';

import { registerCreateSolutionCommand } from './commands/createSolution.command';
import { registerGenerateFromEntityCommand } from './commands/generateFromEntity.command';
import { registerGenerateControllerCommand } from './commands/generateController.command';

/*
|--------------------------------------------------------------------------
| Extension Composition Root
|--------------------------------------------------------------------------
| Only command registration lives here.
*/

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(
		registerCreateSolutionCommand(),
		registerGenerateFromEntityCommand(),
		registerGenerateControllerCommand()
	);

	vscode.window.showInformationMessage(
		'Clean Architecture Generator activated'
	);
}

export function deactivate() { }
