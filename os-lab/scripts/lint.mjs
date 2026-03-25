import ts from "typescript";

const configPath = ts.findConfigFile(".", ts.sys.fileExists, "tsconfig.json");

if (!configPath) {
  console.error("Could not find tsconfig.json");
  process.exit(1);
}

const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

if (configFile.error) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext([configFile.error], {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => "\n",
    })
  );
  process.exit(1);
}

const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ".");
const options = {
  ...parsed.options,
  incremental: false,
  plugins: undefined,
};

const existingFiles = parsed.fileNames.filter(
  (fileName) => ts.sys.fileExists(fileName) && !fileName.endsWith("next-env.d.ts")
);
const program = ts.createProgram(existingFiles, options);
const diagnostics = ts.getPreEmitDiagnostics(program);

if (diagnostics.length > 0) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => "\n",
    })
  );
  process.exit(1);
}

console.log(`TypeScript validation passed for ${existingFiles.length} files.`);
