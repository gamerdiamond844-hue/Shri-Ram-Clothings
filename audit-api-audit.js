const fs = require('fs');
const path = require('path');

const walk = (dir, exts) => {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walk(fullPath, exts));
    } else if (exts.includes(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
};

const frontendFiles = walk(path.join(__dirname, 'frontend', 'src'), ['.js', '.jsx']);
const serverText = fs.readFileSync(path.join(__dirname, 'backend', 'server.js'), 'utf8');
const mountRegex = /app\.use\(['\"]([^'\"]+)['\"],\s*require\(['\"]\.\/routes\/([^'\"]+)['\"]\)\)/g;
const mounts = [];
let mountMatch;
while ((mountMatch = mountRegex.exec(serverText))) {
  mounts.push({ prefix: mountMatch[1], routeFile: mountMatch[2] });
}

const apiCalls = new Set();
for (const file of frontendFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const regex = /api\.(get|post|put|delete)\(['\"]([^'\"]+)['\"]/g;
  let m;
  while ((m = regex.exec(text))) {
    const method = m[1].toUpperCase();
    let route = m[2].trim().replace(/\?.*$/, '');
    if (!route.startsWith('/')) route = `/${route}`;
    if (!route.startsWith('/api/')) route = `/api${route}`;
    apiCalls.add(`${method} ${route}`);
  }
}

const backendRoutes = new Set();
for (const mount of mounts) {
  const routeFilePath = path.join(__dirname, 'backend', 'routes', `${mount.routeFile}.js`);
  if (!fs.existsSync(routeFilePath)) continue;
  const text = fs.readFileSync(routeFilePath, 'utf8');
  const regex = /router\.(get|post|put|delete)\(['\"]([^'\"]*)['\"]/g;
  let m;
  while ((m = regex.exec(text))) {
    let route = m[2] || '';
    if (!route.startsWith('/')) route = `/${route}`;
    const fullRoute = path.posix.join(mount.prefix, route).replace(/\/+/g, '/');
    const normalized = fullRoute.replace(/\/+$|(?<!^)\/$/, '');
    backendRoutes.add(`${m[1].toUpperCase()} ${normalized}`);
  }
}

const normalizeRoute = (route) => route.replace(/\/+$|(?<!^)\/$/, '');
const sortedApi = [...apiCalls].sort();
const sortedRoutes = [...backendRoutes].sort();
const missing = sortedApi.filter(e => !sortedRoutes.includes(`${e.split(' ')[0]} ${normalizeRoute(e.split(' ')[1])}`));
console.log('Frontend API calls:', sortedApi.length);
console.log(sortedApi.join('\n'));
console.log('------');
console.log('Backend routes:', sortedRoutes.length);
console.log(sortedRoutes.join('\n'));
console.log('------');
console.log('Missing actual backend routes for frontend calls:');
missing.forEach(x => console.log(x));
