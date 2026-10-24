const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('four compatible frontend/tooling security patches retain ranges, graph and no install lifecycle hooks', () => {
  const lock = JSON.parse(fs.readFileSync(path.join(__dirname, '../package-lock.json'), 'utf8')).packages;
  const cases = [
    ['node_modules/fflate', '0.8.3', 'node_modules/@types/three', 'fflate', '~0.8.2', 'sha512-tbZNuJrLwGUp3zshBtdy4W+ORxZuIh8a5ilyIEQDC5rY1f3U20JMry0Ll3WBzU58EZKsEuJFXhb5gwv8CsPvgA=='],
    ['node_modules/three-stdlib/node_modules/fflate', '0.6.11', 'node_modules/three-stdlib', 'fflate', '^0.6.9', 'sha512-3JyEFWGjFn7zHmoa9+zG1BmW7X2okcmAB+0Cnu9UFbVs/jCBnl2A8o065ZlXiw145K3eBM3uLuzrYXC0RK7eDg=='],
    ['node_modules/babel-plugin-macros/node_modules/yaml', '1.10.3', 'node_modules/babel-plugin-macros/node_modules/cosmiconfig', 'yaml', '^1.10.0', 'sha512-vIYeF1u3CjlhAFekPPAk2h/Kv4T3mAkMox5OymRiJQB0spDP10LHvt+K7G9Ny6NuuMAb25/6n1qyUjAcGNf/AA=='],
    ['node_modules/proxy-addr', '2.0.8', 'node_modules/express', 'proxy-addr', '^2.0.7', 'sha512-5nnx0yGyVUcY6t9RnWcARWtwT9F1D8O9rt08htPvnd49W1IgZtmLkhu9WfMzQj1cFxjHIO6connUNVW5k7AVyQ=='],
  ];
  for (const [location, version, parent, name, range, integrity] of cases) {
    const entry = lock[location];
    assert.equal(entry.version, version);
    assert.equal(entry.resolved, `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`);
    assert.equal(entry.integrity, integrity);
    assert.equal(lock[parent].dependencies[name], range);
    assert.equal(Boolean(entry.hasInstallScript), false);
  }
  assert.deepEqual(lock['node_modules/proxy-addr'].dependencies, { forwarded: '0.2.0', 'ipaddr.js': '1.9.1' });
  assert.equal(lock['node_modules/proxy-addr'].dev, true);
});
