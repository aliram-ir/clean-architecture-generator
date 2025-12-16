// clean-architecture-generator-master/src/generators/dto.generator.ts
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode'; // For displaying error messages
import { ProjectContext } from '../core/projectContext';
import { pluralize, writeIfMissing } from '../core/helpers';

/**
 * Helper function to extract public properties from C# class content
 * @param entityContent Entity class file content
 * @returns Array of objects containing property name and type
 */
function extractProperties(entityContent: string): { type: string; name: string }[] {
    const properties: { type: string; name: string }[] = [];
    // ✅ Regex to find Public Properties with format "public Type PropertyName { get; set; }"
    // This Regex captures property type (Type) and name (Name).
    // Also covers nullable types (e.g., string?) and generic types (e.g., List<Product>).
    // 'virtual' (for Navigation Properties) is also considered.
    const propertyRegex = /public\s+(?:virtual\s+)?(?<type>\w+(?:<\s*\w+\s*>)?\??)\s+(?<name>\w+)\s*{\s*get;\s*(?:set;|private\s+set;)\s*}/g;
    let match;

    while ((match = propertyRegex.exec(entityContent)) !== null) {
        if (match.groups) {
            properties.push({
                type: match.groups.type,
                name: match.groups.name
            });
        }
    }
    return properties;
}

/**
 * Generates DTOs in the Application layer.
 * DTOs are created only in Application and their fields are extracted from the original Entity.
 * @param ctx Project context
 * @param entity Entity name
 * @param entityFilePath Full path to Entity file for field extraction
 */
export function generateDtos(ctx: ProjectContext, entity: string, entityFilePath: string): void { // ✅ Function signature updated

    const plural = pluralize(entity);

    const dtoRoot = path.join(
        ctx.layers.application,
        'DTOs',
        plural
    );

    fs.mkdirSync(dtoRoot, { recursive: true });

    // ✅ Read Entity file content
    let entityProperties: { type: string; name: string }[] = [];
    try {
        const entityContent = fs.readFileSync(entityFilePath, 'utf8');
        entityProperties = extractProperties(entityContent);
    } catch (error: any) {
        vscode.window.showErrorMessage(`❌ Unable to read Entity file: ${entityFilePath}. Error: ${error.message}`);
        console.error(`❌ Failed to read entity file: ${entityFilePath}`, error);
        return; // Exit if unable to read file
    }

    // ----------------------------------
    // ✅ Generate ${entity}Dto.cs (for Get)
    // ----------------------------------
    const entityDtoProperties = entityProperties
        .map(p => `        public ${p.type} ${p.name} { get; set; }`)
        .join('\n');

    writeIfMissing(
        path.join(dtoRoot, `${entity}Dto.cs`),
        `using System; // For Guid, if needed
namespace ${ctx.solutionName}.Application.DTOs.${plural}
{
    public class ${entity}Dto
    {
        //public Guid Id { get; set; } // Assumes Id is always Guid and displayed in DTO.
${entityDtoProperties ? '\n' + entityDtoProperties : ''}
    }
}`
    );

    // ----------------------------------
    // ✅ Generate Create${entity}Dto.cs (for Create)
    // ----------------------------------
    const createDtoProperties = entityProperties
        // ✅ Filter out Id and timestamp/audit fields that are typically not sent in Create
        .filter(p => p.name !== "Id" && p.name !== "CreatedAt" && p.name !== "LastModifiedAt" && p.name !== "CreatedBy" && p.name !== "LastModifiedBy")
        .map(p => `        public ${p.type} ${p.name} { get; set; }`)
        .join('\n');

    writeIfMissing(
        path.join(dtoRoot, `Create${entity}Dto.cs`),
        `namespace ${ctx.solutionName}.Application.DTOs.${plural}
{
    public class Create${entity}Dto
    {
${createDtoProperties ? '\n' + createDtoProperties : ''}
    }
}`
    );

    // ----------------------------------
    // ✅ Generate Update${entity}Dto.cs (for Update)
    // ----------------------------------
    const updateDtoProperties = entityProperties
        // ✅ Filter out CreatedAt which is typically not modifiable in Update. Id is required.
        .filter(p => p.name !== "CreatedAt" && p.name !== "CreatedBy")
        .map(p => `        public ${p.type} ${p.name} { get; set; }`)
        .join('\n');

    writeIfMissing(
        path.join(dtoRoot, `Update${entity}Dto.cs`),
        `using System; // For Guid, if needed
namespace ${ctx.solutionName}.Application.DTOs.${plural}
{
    public class Update${entity}Dto
    {
        //public Guid Id { get; set; } // Id is required for Update operations.
${updateDtoProperties ? '\n' + updateDtoProperties : ''}
    }
}`
    );
}