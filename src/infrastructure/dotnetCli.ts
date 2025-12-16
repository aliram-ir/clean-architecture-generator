import { exec } from 'child_process';

/*
|--------------------------------------------------------------------------
| Dotnet CLI Wrapper
|--------------------------------------------------------------------------
*/

export function run(cmd: string, cwd: string): Promise<void> {

    return new Promise((resolve, reject) =>
        exec(cmd, { cwd }, err => (err ? reject(err) : resolve()))
    );
}
