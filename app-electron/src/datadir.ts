export function GetDataDir(cmdLine: Electron.CommandLine): string {
  // Return if data argument is not given.
  if (!cmdLine.hasSwitch("data")) {
      return "";
  }

  // Get data dir from command line.
  let dataDir = cmdLine.getSwitchValue("data");

  // If dataDir is empty, the argument might have be supplied without `=`.
  if (dataDir === "") {
      dataDir = process.argv[process.argv.indexOf("--data")+1];
  }

  // Return if undefined.
  if (!dataDir) {
      return "";
  }

  return dataDir;
}
