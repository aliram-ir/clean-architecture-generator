// clean-architecture-generator-master/src/infrastructure/nugetInstaller.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { execSync } from 'child_process';
import * as fs from 'fs';

/*
|--------------------------------------------------------------------------
| Auto NuGet Installer
|--------------------------------------------------------------------------
| ✅ Config-driven
| ✅ Idempotent
| ✅ Clean Architecture aware
| ✅ No duplicate installs
| ✅ Installs required packages based on project configuration
| ✅ Removes deprecated AutoMapper.Extensions.Microsoft.DependencyInjection installation
*/

interface PackageRef {
    projectPath: string; // Full path to .csproj file
    name: string;
    version?: string;
}

export function autoInstallNugets(
    solutionRoot: string,
    solutionName: string
): void {

    // ✅ Get extension configuration
    const config = vscode.workspace.getConfiguration('cleanArchitectureGenerator');

    const useMemoryCache = config.get<boolean>('useMemoryCache', false);
    const useAutoMapper = config.get<boolean>('useAutoMapper', true);
    const useEntityFrameworkCore = config.get<boolean>('useEntityFrameworkCore', true);

    const packagesToInstall: PackageRef[] = [];

    // ------------------------------------------------------------
    // ✅ Application Layer Packages
    // ------------------------------------------------------------
    const applicationProjPath = findCsproj(
        solutionRoot,
        `${solutionName}.Application`
    );

    if (applicationProjPath) {
        // ✅ Memory Cache
        if (useMemoryCache) {
            packagesToInstall.push({
                projectPath: applicationProjPath,
                name: 'Microsoft.Extensions.Caching.Memory'
            });
        }

        // ✅ AutoMapper
        if (useAutoMapper) {
            packagesToInstall.push(
                {
                    projectPath: applicationProjPath,
                    name: 'AutoMapper'
                }
                // ❌ AutoMapper.Extensions.Microsoft.DependencyInjection is deprecated from version 13 onwards,
                // so there's no need to install it and it's removed from this list.
                // {
                //     projectPath: applicationProjPath,
                //     name: 'AutoMapper.Extensions.Microsoft.DependencyInjection'
                // }
            );
        }
    }

    // ------------------------------------------------------------
    // ✅ Infrastructure Layer Packages (for EntityFrameworkCore)
    // ------------------------------------------------------------
    const infrastructureProjPath = findCsproj(
        solutionRoot,
        `${solutionName}.Infrastructure`
    );

    if (infrastructureProjPath) {
        if (useEntityFrameworkCore) {
            packagesToInstall.push(
                {
                    projectPath: infrastructureProjPath,
                    name: 'Microsoft.EntityFrameworkCore'
                },
                {
                    projectPath: infrastructureProjPath,
                    name: 'Microsoft.EntityFrameworkCore.SqlServer' // Default for SQL Server database
                },
                {
                    projectPath: infrastructureProjPath,
                    name: 'Microsoft.EntityFrameworkCore.Tools' // For Migrations
                },
                {
                    projectPath: infrastructureProjPath,
                    name: 'Microsoft.EntityFrameworkCore.Design' // For design tools, especially when working with Migrations from a separate layer
                }
            );
        }
    }

    // ------------------------------------------------------------
    // ✅ Package Installation (Non-destructive / Idempotent)
    // ------------------------------------------------------------
    for (const pkg of packagesToInstall) {
        // ✅ Check if package is already installed
        if (hasPackageReference(pkg.projectPath, pkg.name)) {
            console.log(`Package ${pkg.name} already installed in ${pkg.projectPath}. Skipping.`); // For debugging
            continue;
        }

        const cmd = `dotnet add "${pkg.projectPath}" package ${pkg.name}`;
        console.log(`Executing: ${cmd}`); // For debugging
        exec(cmd);
    }
}

// ================================================================
// Helpers
// ================================================================

function exec(command: string) {
    try {
        execSync(command, { stdio: 'ignore' });
    } catch (error: any) {
        // ❌ Show error to user for better notification
        vscode.window.showErrorMessage(`❌ Failed to execute command: ${command}. Error: ${error.message}`);
        console.error(`Failed to execute command: ${command}`, error);
    }
}

function findCsproj(root: string, projectName: string): string | null {
    const projectDir = path.join(root, projectName);
    if (!fs.existsSync(projectDir)) {
        console.log(`Project directory not found: ${projectDir}`); // For debugging
        return null;
    }

    // ✅ Search for .csproj file in project directory
    const filesInProjectDir = fs.readdirSync(projectDir);
    const csprojFile = filesInProjectDir.find(f => f.endsWith('.csproj'));

    if (csprojFile) {
        return path.join(projectDir, csprojFile);
    } else {
        console.log(`No .csproj file found in ${projectDir}`); // For debugging
        return null;
    }
}

function hasPackageReference(csprojPath: string, packageName: string): boolean {
    try {
        const content = fs.readFileSync(csprojPath, 'utf8');
        // ✅ Regex for more precise PackageReference existence check
        const regex = new RegExp(`PackageReference\\s+Include\\s*=\\s*["\']${packageName}["\']`, 'i');
        return regex.test(content);
    } catch (error: any) {
        console.error(`Error reading .csproj file at ${csprojPath}: ${error.message}`);
        return false;
    }
}