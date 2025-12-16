import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { run } from '../infrastructure/dotnetCli';
import { autoInstallNugets } from '../infrastructure/nugetInstaller'; // Correct path for nugetInstaller

export function registerCreateSolutionCommand(): vscode.Disposable {

    return vscode.commands.registerCommand(
        'cleanArch.createSolution',
        async () => {

            const workspace = vscode.workspace.workspaceFolders;
            if (!workspace) return;

            const rootPath = workspace[0].uri.fsPath;

            const solutionName = await vscode.window.showInputBox({
                prompt: 'Enter Solution Name',
                ignoreFocusOut: true
            });

            if (!solutionName) return;

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Creating Clean Architecture Solution...',
                    cancellable: false
                },
                async (progress) => {

                    try {

                        const solutionRoot = path.join(rootPath, solutionName);
                        fs.mkdirSync(solutionRoot, { recursive: true });

                        // --------------------------------------------------
                        // Create Solution File (Idempotent)
                        // --------------------------------------------------
                        progress.report({ message: '📄 Ensuring solution file...', increment: 5 });

                        if (!fs.existsSync(path.join(solutionRoot, `${solutionName}.sln`))) {
                            await run(`dotnet new sln -n ${solutionName}`, solutionRoot);
                        }

                        // --------------------------------------------------
                        // Ensure Projects
                        // --------------------------------------------------
                        const layers = ['Domain', 'Application', 'Infrastructure', 'Shared', 'DI'];
                        const step = 25 / layers.length;

                        for (const layer of layers) {

                            progress.report({
                                message: `📦 Ensuring ${layer} project...`,
                                increment: step
                            });

                            const projectName = `${solutionName}.${layer}`;
                            const projectPath = path.join(solutionRoot, projectName);
                            const csproj = path.join(projectPath, `${projectName}.csproj`);

                            if (!fs.existsSync(csproj)) {
                                await run(`dotnet new classlib -n ${projectName}`, solutionRoot);
                                await run(`dotnet sln add "${projectName}/${projectName}.csproj"`, solutionRoot);
                            }
                        }

                        // --------------------------------------------------
                        // Enforce Folder Contracts (Step 1 – reaffirm)
                        // --------------------------------------------------
                        progress.report({
                            message: '📁 Enforcing folder contracts...',
                            increment: 15
                        });

                        const ensure = (p: string) => fs.mkdirSync(p, { recursive: true });

                        // Domain
                        ensure(path.join(solutionRoot, `${solutionName}.Domain`, 'Entities'));
                        ensure(path.join(solutionRoot, `${solutionName}.Domain`, 'ValueObjects'));
                        ensure(path.join(solutionRoot, `${solutionName}.Domain`, 'Enums'));

                        // Application
                        ensure(path.join(solutionRoot, `${solutionName}.Application`, 'Interfaces', 'Repositories')); // Fixed to Repositories
                        ensure(path.join(solutionRoot, `${solutionName}.Application`, 'Interfaces', 'Services'));
                        ensure(path.join(solutionRoot, `${solutionName}.Application`, 'DTOs'));
                        ensure(path.join(solutionRoot, `${solutionName}.Application`, 'Mappings'));
                        ensure(path.join(solutionRoot, `${solutionName}.Application`, 'Services'));

                        // Infrastructure
                        ensure(path.join(solutionRoot, `${solutionName}.Infrastructure`, 'Persistence', 'Contexts'));
                        ensure(path.join(solutionRoot, `${solutionName}.Infrastructure`, 'Persistence', 'Configurations'));
                        ensure(path.join(solutionRoot, `${solutionName}.Infrastructure`, 'Repositories'));

                        // Shared
                        ensure(path.join(solutionRoot, `${solutionName}.Shared`, 'Constants'));
                        ensure(path.join(solutionRoot, `${solutionName}.Shared`, 'Extensions'));

                        // DI
                        ensure(path.join(solutionRoot, `${solutionName}.DI`, 'Extensions'));

                        // --------------------------------------------------
                        // Deterministic Reference Graph (✅ Step 2 core)
                        // --------------------------------------------------
                        progress.report({
                            message: '🔗 Fixing project references...',
                            increment: 20
                        });

                        const ref = async (from: string, to: string) => {
                            await run(
                                `dotnet add "${from}" reference "${to}"`,
                                solutionRoot
                            );
                        };

                        const domainProj = `${solutionName}.Domain/${solutionName}.Domain.csproj`;
                        const appProj = `${solutionName}.Application/${solutionName}.Application.csproj`;
                        const infraProj = `${solutionName}.Infrastructure/${solutionName}.Infrastructure.csproj`;
                        const sharedProj = `${solutionName}.Shared/${solutionName}.Shared.csproj`;
                        const diProj = `${solutionName}.DI/${solutionName}.DI.csproj`;

                        // Application -> Domain
                        await ref(appProj, domainProj);

                        // Infrastructure -> Application + Domain
                        await ref(infraProj, appProj);
                        await ref(infraProj, domainProj);

                        // Optional Shared
                        if (fs.existsSync(path.join(solutionRoot, sharedProj))) {
                            await ref(appProj, sharedProj);
                            await ref(infraProj, sharedProj);
                            await ref(domainProj, sharedProj);
                        }

                        // DI -> Application + Infrastructure
                        await ref(diProj, appProj);
                        await ref(diProj, infraProj);

                        // --------------------------------------------------
                        // Auto NuGet Installer
                        // --------------------------------------------------
                        progress.report({
                            message: '📦 Syncing NuGet packages...',
                            increment: 10
                        });
                        // ✅ Fixed: Correct arguments for autoInstallNugets
                        await autoInstallNugets(solutionRoot, solutionName);

                        // --------------------------------------------------
                        // Done
                        // --------------------------------------------------
                        progress.report({ message: '✅ Finalizing...', increment: 5 });

                        vscode.window.showInformationMessage(
                            '✅ Clean Architecture solution created with deterministic references'
                        );
                    }
                    catch (error: any) {

                        vscode.window.showErrorMessage(
                            `❌ Failed to create solution: ${error?.message ?? error}`
                        );
                    }
                }
            );
        }
    );
}