const path = require('path');
const tsConfig = require('./tsconfig.json');
const tsConfigPaths = require('tsconfig-paths');

const baseUrl = tsConfig.compilerOptions.baseUrl || '.';
const outDir = tsConfig.compilerOptions.outDir || '.';
const explicitParams = {
  baseUrl: path.resolve(baseUrl, outDir),
  paths: tsConfig.compilerOptions.paths,
};

tsConfigPaths.register(explicitParams);
