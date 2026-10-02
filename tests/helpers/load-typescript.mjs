import fs from 'node:fs';
import ts from 'typescript';

const modules = new Map();
async function moduleUrl(url) {
  if (modules.has(url.href)) return modules.get(url.href);
  let code = ts.transpileModule(fs.readFileSync(url, 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  for (const match of code.matchAll(/from ['"]([^'"]+)['"]/g)) {
    const specifier = match[1];
    const resolved = specifier.startsWith('.')
      ? await moduleUrl(
          new URL(specifier + (specifier.endsWith('.ts') ? '' : '.ts'), url),
        )
      : import.meta.resolve(specifier);
    code = code.replace(match[0], `from '${resolved}'`);
  }
  const result = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  modules.set(url.href, result);
  return result;
}

export async function loadTypescript(url) {
  return import(await moduleUrl(url));
}
