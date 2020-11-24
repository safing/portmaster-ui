import { app } from 'electron';

// DataDir holds the data/installation directory of the Portmaster.
export var DataDir = getDataDir();

function getDataDir(): string {
  // Return if data argument is not given.
  if (!app.commandLine.hasSwitch("data")) {
      return "";
  }

  // Get data dir from command line.
  let dataDir = app.commandLine.getSwitchValue("data");

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
