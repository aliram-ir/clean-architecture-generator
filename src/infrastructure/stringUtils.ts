/*
|--------------------------------------------------------------------------
| String Utilities
|--------------------------------------------------------------------------
*/

export function pluralize(name: string): string {

    if (name.endsWith('y')) return name.slice(0, -1) + 'ies';
    if (name.endsWith('s')) return name + 'es';

    return name + 's';
}
