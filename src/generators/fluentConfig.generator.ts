import * as fs from 'fs';
import * as path from 'path';
import { ProjectContext } from '../core/projectContext';
import { pluralize } from '../core/helpers';

function parseEntity(entityFile: string): {
    name: string;
    attributes: string[];
}[] {

    const content = fs.readFileSync(entityFile, 'utf8');

    const propertyRegex =
        /(?:(\[[^\]]+]\s*)*)public\s+[^\s]+\s+([A-Z][A-Za-z0-9_]*)\s*\{\s*get;\s*set;\s*\}/g;

    const props: {
        name: string;
        attributes: string[];
    }[] = [];

    let match: RegExpExecArray | null;

    while ((match = propertyRegex.exec(content)) !== null) {
        const rawAttrs = match[1] ?? '';
        const attrs = Array.from(
            rawAttrs.matchAll(/\[([A-Za-z0-9_]+)(?:\(([^)]*)\))?]/g)
        ).map(m => m[0]);

        props.push({
            name: match[2],
            attributes: attrs
        });
    }

    return props;
}

/**
 * Build Fluent line from attributes
 */
function buildFluentLine(prop: {
    name: string;
    attributes: string[];
}): string {

    let line = `builder.Property(x => x.${prop.name})`;

    for (const attr of prop.attributes) {

        if (attr.startsWith('[MaxLength')) {
            const len = attr.match(/\d+/)?.[0];
            if (len) line += `.HasMaxLength(${len})`;
        }

        if (attr.startsWith('[Required')) {
            line += `.IsRequired()`;
        }
    }

    return `\t\t${line};`;
}

/**
 * Generate or Sync Fluent Configuration
 */
export function generateFluentConfiguration(
    ctx: ProjectContext,
    entity: string
): void {

    const entityFile = path.join(
        ctx.layers.domain,
        'Entities',
        `${entity}.cs`
    );

    if (!fs.existsSync(entityFile)) return;

    const configDir = path.join(
        ctx.layers.infrastructure,
        'Persistence',
        'Configurations'
    );

    fs.mkdirSync(configDir, { recursive: true });

    const configFile = path.join(
        configDir,
        `${entity}Configuration.cs`
    );

    const props = parseEntity(entityFile);

    // --------------------------------------------------
    // Create Fluent if Missing
    // --------------------------------------------------
    if (!fs.existsSync(configFile)) {

        const body = props.map(buildFluentLine).join('\n');

        const content = `
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ${ctx.solutionName}.Domain.Entities;

namespace ${ctx.solutionName}.Infrastructure.Persistence.Configurations;

public sealed class ${entity}Configuration
	: IEntityTypeConfiguration<${entity}>
{
	public void Configure(EntityTypeBuilder<${entity}> builder)
	{
		builder.ToTable("${pluralize(entity)}");

${body}
	}
}
`.trim();

        fs.writeFileSync(configFile, content, 'utf8');
        return;
    }

    // --------------------------------------------------
    // Sync Existing (Add Only)
    // --------------------------------------------------
    let fluent = fs.readFileSync(configFile, 'utf8');

    for (const prop of props) {

        const exists = new RegExp(
            `Property\\s*\\(\\s*x\\s*=>\\s*x\\.${prop.name}\\b`,
            'm'
        ).test(fluent);

        if (exists) continue;

        const line = buildFluentLine(prop);

        fluent = fluent.replace(
            /\}\s*\}\s*$/,
            `${line}\n\t}\n}`
        );
    }

    fs.writeFileSync(configFile, fluent, 'utf8');
}
