import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { resolveProjectContext } from '../core/resolver';
import { detectApiProject } from '../core/layerDetector';
import { pluralize, writeIfMissing } from '../core/helpers';

/*
|--------------------------------------------------------------------------
| Command Registration
|--------------------------------------------------------------------------
| Only responsible for registering the command
| Composition Root depends on this function
*/

export function registerGenerateControllerCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(
        'cleanArch.generateController',
        generateControllerCommand
    );
}

/*
|--------------------------------------------------------------------------
| Command Handler
|--------------------------------------------------------------------------
| Generate API Controller from I{Entity}Service
|
| Trigger:
| ✅ Right‑click on I{Entity}Service.cs
*/

export async function generateControllerCommand(uri: vscode.Uri) {

    // ----------------------------------
    // Validation
    // ----------------------------------
    if (!uri || !uri.fsPath.endsWith('Service.cs')) {
        vscode.window.showErrorMessage(
            '❌ Select an Application Service interface (I{Entity}Service.cs)'
        );
        return;
    }

    const fileName = path.basename(uri.fsPath);

    if (!fileName.startsWith('I') || !fileName.endsWith('Service.cs')) {
        vscode.window.showErrorMessage(
            '❌ File must be named I{Entity}Service.cs'
        );
        return;
    }

    // ----------------------------------
    // Extract Entity Name
    // IProductService.cs → Product
    // ----------------------------------
    const entity = fileName
        .replace(/^I/, '')
        .replace(/Service\.cs$/, '');

    // ----------------------------------
    // Resolve Project Context
    // ----------------------------------
    const ctx = resolveProjectContext(uri.fsPath);
    if (!ctx) {
        vscode.window.showErrorMessage(
            '❌ Unable to resolve project context'
        );
        return;
    }

    // ----------------------------------
    // Detect API Project
    // ----------------------------------
    const apiLayerPath = detectApiProject(ctx.rootPath, ctx.solutionName);
    if (!apiLayerPath) {
        vscode.window.showErrorMessage(
            '❌ API project not detected'
        );
        return;
    }

    const apiProjectName =
        path.basename(apiLayerPath);

    const plural = pluralize(entity);

    // ----------------------------------
    // Controller Path
    // ----------------------------------
    const controllerPath = path.join(
        apiLayerPath,
        'Controllers',
        `${entity}Controller.cs`
    );

    fs.mkdirSync(
        path.dirname(controllerPath),
        { recursive: true }
    );

    /*
    |--------------------------------------------------------------------------
    | Controller Generation
    |--------------------------------------------------------------------------
    | ✅ Depends only on Application Layer
    | ❌ No Entity exposure
    | ✅ REST‑safe & Clean Architecture compliant
    */

    writeIfMissing(
        controllerPath,
        `using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using ${ctx.solutionName}.Application.Interfaces.Services;
using ${ctx.solutionName}.Application.DTOs.${plural};

namespace ${apiProjectName}.Controllers
{
	[ApiController]
	[Route("api/[controller]/[action]")]
	public class ${entity}Controller : ControllerBase
	{
		private readonly I${entity}Service _service;

		public ${entity}Controller(I${entity}Service service)
		{
			_service = service;
		}

		[HttpGet("{id:guid}")]
		public async Task<ActionResult<${entity}Dto>> GetById(Guid id)
		{
			var result = await _service.GetByIdAsync(id);
			return result == null ? NotFound() : Ok(result);
		}

		[HttpGet]
		public async Task<ActionResult<List<${entity}Dto>>> GetAll()
		{
			var result = await _service.GetAllAsync();
			return Ok(result);
		}

		[HttpPost]
		public async Task<ActionResult<${entity}Dto>> Create(
			[FromBody] Create${entity}Dto dto)
		{
			var result = await _service.CreateAsync(dto);
			return CreatedAtAction(
				nameof(GetById),
				new { id = result.Id },
				result
			);
		}

		[HttpPut]
		public async Task<IActionResult> Update(
			[FromBody] Update${entity}Dto dto)
		{
			await _service.UpdateAsync(dto);
			return NoContent();
		}

		[HttpDelete("{id:guid}")]
		public async Task<IActionResult> Delete(Guid id)
		{
			await _service.DeleteAsync(id);
			return NoContent();
		}
	}
}`
    );

    vscode.window.showInformationMessage(
        `✅ ${entity}Controller generated successfully`
    );
}