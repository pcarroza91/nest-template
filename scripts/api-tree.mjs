#!/usr/bin/env node
/**
 * Genera el árbol de la API (módulos → endpoints → cadena de llamadas) leyendo
 * el código con el compilador de TypeScript, y lo inyecta en la vista Escala de
 * docs/architecture/explorable/peticion.html.
 *
 * Uso: pnpm docs:api-tree
 *
 * Solo lee código: no ejecuta la aplicación ni necesita base de datos.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'src');
const PAGE = path.join(ROOT, 'docs/architecture/explorable/peticion.html');
const OPENAPI = path.join(ROOT, 'identity_service_openapi.yaml');
const HTTP_DECORATORS = ['Get', 'Post', 'Put', 'Patch', 'Delete'];
const HTTP_STATUS = { OK: 200, CREATED: 201, NO_CONTENT: 204, BAD_REQUEST: 400, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, UNPROCESSABLE_ENTITY: 422, BAD_GATEWAY: 502 };

const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) return walk(full);
    return d.name.endsWith('.ts') && !d.name.endsWith('.spec.ts') ? [full] : [];
  });
}

function moduleOf(file) {
  const r = rel(file);
  const m = r.match(/^src\/modules\/([^/]+)\//);
  if (m) return m[1];
  if (r.startsWith('src/health/')) return 'health';
  if (r.startsWith('src/common/')) return 'common';
  if (r.startsWith('src/config/')) return 'config';
  return 'bootstrap';
}

function kindOf(className, decorators) {
  if (decorators.some((d) => d.name === 'Entity')) return 'entity';
  for (const k of ['Controller', 'Service', 'Business', 'Repository', 'Mapper', 'Module', 'Guard', 'Interceptor', 'Filter']) {
    if (className.endsWith(k)) return k.toLowerCase();
  }
  if (className.endsWith('Exception')) return 'exception';
  return 'class';
}

const lineOf = (sf, node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
const textOf = (node) => (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null);

function decoratorsOf(node) {
  const list = ts.canHaveDecorators(node) ? ts.getDecorators(node) || [] : [];
  return list.map((d) => {
    const e = d.expression;
    if (ts.isCallExpression(e)) return { name: e.expression.getText(), args: e.arguments };
    return { name: e.getText(), args: [] };
  });
}

/* ── Índice de clases ─────────────────────────────────── */
const files = walk(SRC);
const classes = {};
const typeImports = [];

for (const file of files) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const mod = moduleOf(file);

  sf.statements.filter(ts.isImportDeclaration).forEach((imp) => {
    const spec = imp.moduleSpecifier.text;
    const target = spec.startsWith('src/modules/')
      ? spec.split('/')[2]
      : spec.startsWith('.') ? moduleOf(path.resolve(path.dirname(file), spec) + '.ts') : null;
    if (!target || target === mod || ['common', 'config', 'bootstrap', 'health'].includes(target) || ['bootstrap', 'common', 'config'].includes(mod)) return;
    const names = imp.importClause?.namedBindings && ts.isNamedImports(imp.importClause.namedBindings)
      ? imp.importClause.namedBindings.elements.map((e) => e.name.text) : [];
    typeImports.push({ from: mod, to: target, names, file: rel(file), line: lineOf(sf, imp) });
  });

  sf.statements.filter(ts.isClassDeclaration).forEach((cls) => {
    if (!cls.name) return;
    const decorators = decoratorsOf(cls);
    const info = {
      name: cls.name.text, file: rel(file), line: lineOf(sf, cls), module: mod,
      kind: kindOf(cls.name.text, decorators), decorators, deps: {}, methods: {}, sf, node: cls,
    };
    cls.members.forEach((m) => {
      if (ts.isConstructorDeclaration(m)) {
        m.parameters.forEach((p) => {
          const type = p.type ? p.type.getText(sf) : '';
          const inject = decoratorsOf(p).find((d) => d.name === 'InjectRepository');
          info.deps[p.name.getText(sf)] = { type, entity: inject ? inject.args[0].getText(sf) : (type.match(/^Repository<(\w+)>$/) || [])[1] || null };
        });
      }
      if (ts.isMethodDeclaration(m) && m.name) {
        info.methods[m.name.getText(sf)] = { name: m.name.getText(sf), line: lineOf(sf, m), node: m, decorators: decoratorsOf(m) };
      }
    });
    classes[info.name] = info;
  });
}

/* ── Análisis de un método: llamadas a dependencias ───── */
function chainOf(call) {
  const names = [];
  let e = call;
  while (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression)) {
    names.unshift(e.expression.name.text);
    e = e.expression.expression;
  }
  if (ts.isPropertyAccessExpression(e) && e.expression.kind === ts.SyntaxKind.ThisKeyword) return { prop: e.name.text, names };
  if (e.kind === ts.SyntaxKind.ThisKeyword) return { prop: null, names };
  return null;
}
function innerCalls(call) {
  const out = [];
  let e = call;
  while (ts.isCallExpression(e)) {
    out.push(e);
    e = ts.isPropertyAccessExpression(e.expression) ? e.expression.expression : e.expression;
  }
  return out;
}

function analyzeMethod(cls, methodName) {
  const m = cls.methods[methodName];
  if (!m) return null;
  const sf = cls.sf;
  const calls = [];
  const throws = [];
  const visit = (node) => {
    if (ts.isThrowStatement(node) && node.expression && ts.isNewExpression(node.expression)) {
      throws.push({ name: node.expression.expression.getText(sf), line: lineOf(sf, node) });
    }
    if (ts.isCallExpression(node)) {
      const parentIsChain = ts.isPropertyAccessExpression(node.parent) && ts.isCallExpression(node.parent.parent) && node.parent.parent.expression === node.parent;
      const chain = !parentIsChain && chainOf(node);
      if (chain && chain.names.length) {
        calls.push({ ...chain, line: lineOf(sf, node), pos: node.getStart(sf) });
        innerCalls(node).forEach((c) => c.arguments.forEach(visit));
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  if (m.node.body) visit(m.node.body);
  calls.sort((a, b) => a.pos - b.pos);
  const body = m.node.body ? m.node.body.getText(sf) : '';
  return { method: m, calls, throws, body };
}

/* ── Excepciones → status (desde el filtro global) ───── */
const filterFile = files.find((f) => f.endsWith('global-exception.filter.ts'));
const exceptionStatus = {};
if (filterFile) {
  for (const [, ex, st] of fs.readFileSync(filterFile, 'utf8').matchAll(/(\w+Exception):\s*HttpStatus\.(\w+)/g)) exceptionStatus[ex] = HTTP_STATUS[st] || st;
}

/* ── Entidades y tablas ───────────────────────────────── */
const entities = Object.values(classes).filter((c) => c.kind === 'entity').map((c) => {
  const d = c.decorators.find((x) => x.name === 'Entity');
  return { name: c.name, table: textOf(d.args[0]) || c.name.toLowerCase(), module: c.module, file: c.file, line: c.line };
});
const tableOf = (entity) => entities.find((e) => e.name === entity)?.table || null;

/* ── Requisitos desde el OpenAPI (lectura por líneas) ─── */
const contract = {};
if (fs.existsSync(OPENAPI)) {
  let route = null;
  let cur = null;
  let inDesc = false;
  const rfs = (text) => [...text.matchAll(/RF\d+(?:\.\d+)?[a-z]?/g)].map((x) => x[0]);
  for (const line of fs.readFileSync(OPENAPI, 'utf8').split('\n')) {
    const p = /^ {2}(\/[^:]+):\s*$/.exec(line);
    if (p) { route = p[1].replace(/\{(\w+)\}/g, ':$1'); cur = null; inDesc = false; continue; }
    const mm = /^ {4}(get|post|put|patch|delete):\s*$/.exec(line);
    if (mm && route) { cur = contract[`${mm[1].toUpperCase()} ${route}`] = { rf: [], public: false }; inDesc = false; continue; }
    if (!cur) continue;
    if (/^ {6}security:\s*\[\s*\]/.test(line)) cur.public = true;
    const d = /^ {6}description:(.*)$/.exec(line);
    if (d) { inDesc = true; cur.rf.push(...rfs(d[1])); continue; }
    if (inDesc) {
      if (/^ {8,}\S/.test(line)) cur.rf.push(...rfs(line));
      else inDesc = false;
    }
  }
}
const rfByRoute = Object.fromEntries(Object.entries(contract).map(([k, v]) => [k, v.rf.length ? [...new Set(v.rf)].join(' · ') : null]));

/* ── main.ts: lo que aplica la entrada ────────────────── */
const mainSrc = fs.readFileSync(path.join(SRC, 'main.ts'), 'utf8');
const excludes = (mainSrc.match(/exclude:\s*\[([^\]]*)\]/) || [, ''])[1].match(/'[^']+'/g)?.map((s) => s.slice(1, -1)) || [];
const globals = [
  /helmet\(\)/.test(mainSrc) && 'helmet',
  /enableCors/.test(mainSrc) && 'CORS',
  /setGlobalPrefix/.test(mainSrc) && 'prefijo /api',
  /enableVersioning/.test(mainSrc) && 'versión /v1',
  /new ValidationPipe/.test(mainSrc) && `ValidationPipe${/forbidNonWhitelisted:\s*true/.test(mainSrc) ? ' (whitelist estricta)' : ''}`,
  /ResponseInterceptor/.test(mainSrc) && 'sobre de respuesta',
  /GlobalExceptionFilter/.test(mainSrc) && 'filtro global de excepciones',
  /enableShutdownHooks/.test(mainSrc) && 'apagado ordenado',
].filter(Boolean);

/* ── Expansión de una llamada en nodos del árbol ──────── */
function resolveDep(cls, prop) {
  const dep = cls.deps[prop];
  if (!dep) return null;
  const typeName = dep.type.replace(/<.*$/, '');
  const target = classes[typeName];
  if (target) return { kind: target.kind, cls: target };
  if (dep.entity) return { kind: 'orm', entity: dep.entity };
  return { kind: 'lib', type: dep.type };
}

function expandMethod(cls, methodName, depth = 0) {
  const a = analyzeMethod(cls, methodName);
  if (!a) return { calls: [], throws: [] };
  const children = [];
  for (const call of a.calls) {
    if (call.prop === null) {
      const inner = call.names[0];
      if (cls.methods[inner] && depth < 2) {
        const sub = expandMethod(cls, inner, depth + 1);
        children.push({ kind: cls.kind, label: `${inner}()`, cls: cls.name, method: inner, file: cls.file, line: cls.methods[inner].line, self: true, children: sub.children });
      }
      continue;
    }
    const target = resolveDep(cls, call.prop);
    if (!target) continue;
    if (target.kind === 'orm') {
      children.push({ kind: 'orm', label: `ORM ${call.names.join('.')}()`, table: tableOf(target.entity), entity: target.entity, file: cls.file, line: call.line });
      continue;
    }
    if (target.kind === 'lib') {
      children.push({ kind: 'lib', label: `${target.type}.${call.names.join('.')}()`, file: cls.file, line: call.line });
      continue;
    }
    const t = target.cls;
    if (target.kind === 'business' && call.names.length > 1) {
      const steps = call.names.map((n) => {
        const sub = depth < 2 ? expandMethod(t, n, depth + 1) : { children: [] };
        return { kind: 'rule', label: `${n}()`, cls: t.name, method: n, file: t.file, line: t.methods[n]?.line, children: sub.children };
      });
      children.push({ kind: 'business', label: `${t.name} · ${call.names.length} pasos`, cls: t.name, file: t.file, line: call.line, chain: call.names, children: steps });
      continue;
    }
    const n = call.names[0];
    const sub = depth < 2 ? expandMethod(t, n, depth + 1) : { children: [] };
    children.push({
      kind: t.kind, label: `${t.name}.${call.names.join('().')}()`, cls: t.name, method: n, module: t.module,
      crossModule: t.module !== cls.module, file: t.file, line: t.methods[n]?.line, children: sub.children,
    });
  }
  const grouped = {};
  for (const th of a.throws) (grouped[th.name] ??= []).push(th.line);
  for (const [name, lines] of Object.entries(grouped)) {
    children.push({ kind: 'throw', label: `lanza ${name}${lines.length > 1 ? ` ×${lines.length}` : ''}`, exception: name, status: exceptionStatus[name] || null, file: cls.file, line: lines[0] });
  }
  return { children, analysis: a };
}

/* ── Endpoints ────────────────────────────────────────── */
const modules = {};
const ensureModule = (id) => (modules[id] ??= { id, controllers: [], endpoints: [], packages: {}, entities: [] });

for (const cls of Object.values(classes).filter((c) => c.kind === 'controller')) {
  const sf = cls.sf;
  const cd = cls.decorators.find((d) => d.name === 'Controller');
  let base = '';
  let versionNeutral = false;
  if (cd && cd.args[0]) {
    const arg = cd.args[0];
    if (ts.isObjectLiteralExpression(arg)) {
      arg.properties.forEach((p) => {
        if (p.name?.getText(sf) === 'path') base = textOf(p.initializer) || '';
        if (p.name?.getText(sf) === 'version' && /VERSION_NEUTRAL/.test(p.initializer.getText(sf))) versionNeutral = true;
      });
    } else base = textOf(arg) || '';
  }
  const classGuards = cls.decorators.filter((d) => d.name === 'UseGuards').flatMap((d) => d.args.map((a) => a.getText(sf)));
  const mod = ensureModule(cls.module);
  mod.controllers.push({ name: cls.name, base, file: cls.file, line: cls.line, guards: classGuards });
  const servicePropEntries = Object.entries(cls.deps);

  for (const m of Object.values(cls.methods)) {
    const http = m.decorators.find((d) => HTTP_DECORATORS.includes(d.name));
    if (!http) continue;
    const sub = textOf(http.args[0]) || '';
    const isPublic = m.decorators.some((d) => d.name === 'Public');
    const message = textOf(m.decorators.find((d) => d.name === 'ResponseMessage')?.args[0]);
    const codeDec = m.decorators.find((d) => d.name === 'HttpCode');
    const httpCode = codeDec ? HTTP_STATUS[(codeDec.args[0].getText(sf).match(/HttpStatus\.(\w+)/) || [])[1]] : (http.name === 'Post' ? 201 : 200);
    const joined = [base, sub].filter(Boolean).join('/');
    const unprefixed = excludes.some((x) => joined === x || joined.startsWith(x + '/')) || versionNeutral;
    const fullPath = unprefixed ? `/${joined}` : `/api/v1/${joined}`;

    const a = analyzeMethod(cls, m.name);
    const svcCall = a.calls.find((c) => c.prop && resolveDep(cls, c.prop)?.kind === 'service');
    let service = null;
    if (svcCall) {
      const t = resolveDep(cls, svcCall.prop).cls;
      const exp = expandMethod(t, svcCall.names[0]);
      const meaningful = exp.children.some((c) => ['repository', 'business', 'service', 'orm'].includes(c.kind));
      const stub = !meaningful && /Promise\.resolve/.test(exp.analysis?.body || '');
      service = { cls: t.name, method: svcCall.names[0], file: t.file, line: t.methods[svcCall.names[0]]?.line, stub, children: exp.children };
    }
    const otherCalls = a.calls.filter((c) => c !== svcCall && c.prop).map((c) => ({ prop: c.prop, names: c.names, type: cls.deps[c.prop]?.type }));
    mod.endpoints.push({
      method: http.name.toUpperCase(), path: fullPath, handler: m.name, controller: cls.name, file: cls.file, line: m.line,
      guards: classGuards, public: isPublic, message, httpCode,
      rf: rfByRoute[`${http.name.toUpperCase()} ${fullPath.replace(/\/$/, '')}`] || null,
      contractPublic: contract[`${http.name.toUpperCase()} ${fullPath.replace(/\/$/, '')}`]?.public ?? null,
      inContract: Boolean(contract[`${http.name.toUpperCase()} ${fullPath.replace(/\/$/, '')}`]),
      service, direct: otherCalls, injected: servicePropEntries.map(([k, v]) => `${k}: ${v.type}`),
    });
  }
}

/* ── Paquetes por módulo ──────────────────────────────── */
for (const cls of Object.values(classes)) {
  if (!['controller', 'service', 'business', 'repository', 'mapper', 'entity'].includes(cls.kind)) continue;
  if (['common', 'config', 'bootstrap'].includes(cls.module)) continue;
  const mod = ensureModule(cls.module);
  (mod.packages[cls.kind] ??= []).push({
    name: cls.name, file: cls.file, line: cls.line,
    scope: /Scope\.(\w+)/.exec(cls.decorators.find((d) => d.name === 'Injectable')?.args[0]?.getText(cls.sf) || '')?.[1] || null,
    methods: Object.values(cls.methods).filter((m) => !m.name.startsWith('_')).map((m) => ({ name: m.name, line: m.line })),
  });
}
for (const file of files.filter((f) => /\/dto\/[^/]+\.ts$/.test(f))) {
  const mod = moduleOf(file);
  if (!modules[mod]) continue;
  const names = [...fs.readFileSync(file, 'utf8').matchAll(/export (?:class|enum|interface|type) (\w+)/g)].map((x) => x[1]);
  (modules[mod].packages.dto ??= []).push({ name: path.basename(file, '.ts'), file: rel(file), exports: names });
}
for (const e of entities) if (modules[e.module]) modules[e.module].entities.push(e);
for (const mod of Object.values(modules)) {
  const dir = mod.id === 'health' ? path.join(SRC, 'health') : path.join(SRC, 'modules', mod.id);
  mod.dir = rel(dir);
  mod.emptyFolders = ['business', 'entities', 'mappers', 'repositories'].filter((f) => {
    const d = path.join(dir, f);
    return fs.existsSync(d) && fs.readdirSync(d).every((x) => x === '.gitkeep');
  });
}

const order = Object.keys(modules).sort((a, b) => (a === 'resource' ? -1 : b === 'resource' ? 1 : a === 'health' ? 1 : b === 'health' ? -1 : a.localeCompare(b)));
const dedupImports = Object.values(typeImports.reduce((acc, t) => {
  const k = `${t.from}>${t.to}`;
  acc[k] ??= { from: t.from, to: t.to, names: new Set(), files: new Set() };
  t.names.forEach((n) => acc[k].names.add(n));
  acc[k].files.add(t.file);
  return acc;
}, {})).map((t) => ({ from: t.from, to: t.to, names: [...t.names], files: [...t.files] }));

const data = {
  generatedAt: new Date().toISOString(),
  generator: 'scripts/api-tree.mjs',
  api: { entry: 'src/main.ts', prefix: '/api/v1', globals, excludes },
  exceptionStatus,
  modules: order.map((id) => modules[id]),
  typeImports: dedupImports,
};

if (process.argv.includes('--print')) {
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

/* ── Inyección en la página ───────────────────────────── */
const json = JSON.stringify(data).replace(/</g, '\\u003c');
const html = fs.readFileSync(PAGE, 'utf8');
const re = /(<script id="api-tree-data" type="application\/json">)[\s\S]*?(<\/script>)/;
if (!re.test(html)) {
  console.error('No encontré <script id="api-tree-data"> en', rel(PAGE));
  process.exit(1);
}
fs.writeFileSync(PAGE, html.replace(re, `$1${json}$2`));
const endpoints = data.modules.reduce((n, m) => n + m.endpoints.length, 0);
console.log(`api-tree: ${data.modules.length} módulos · ${endpoints} endpoints · ${entities.length} entidades → ${rel(PAGE)}`);
