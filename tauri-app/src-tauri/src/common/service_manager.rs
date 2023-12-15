use std::process::{Command, Stdio, ExitStatus};
use std::io;

static SYSTEMCTL: &str = "systemctl";
static PKEXEC: &str = "pkexec";
// TODO(ppacher): add support for kdesudo and gksudo

/// SystemResult defines the "success" codes when querying or starting
/// a system service. 
pub enum StatusResult {
    // The requested system service is installed and currently running.
    Running,

    // The requested system service is installed but currently stopped.
    Stopped,

    // NotFound is returned when the system service (systemd unit for linux)
    // has not been found and the system and likely means the Portmaster installtion
    // is broken all together. 
    NotFound,

    // For linux, there are multiple system service managers so we might encounter
    // the situation where systemd is not installed. This is not considered an error
    // here because it's fine for distros to use a different system manager but
    // we need to account for that and display an "unsupported system manager"
    // in the user interface nonetheless.
    Unsupported,
}

pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

/// A common interface to the system manager service (might be systemd, openrc, sc.exe, ...)
pub trait ServiceManager {
    fn status(&self, name: &str) -> Result<StatusResult>;
    fn start(&self, name: &str) -> Result<StatusResult>;
}

/// System Service manager implementation for Linux based distros.
#[cfg(target_os = "linux")]
pub struct SystemdServiceManager {}

// TODO(ppacher): add an implementation for target_os = "windows"!


impl ServiceManager for SystemdServiceManager {
    fn status(&self, name: &str) -> Result<StatusResult> {
        let result = systemctl("is-active", name, false);

        match result {
            // If `systemctl is-active` returns without an error code and stdout matches "active" (just to guard againt 
            // unhandled cases), the service can be considered running.
            Ok(stdout) => {
                let mut copy = stdout.to_owned();
                trim_newline(&mut copy);

                if copy != "active" {
                    // make sure the output is as we expected
                    Err(Box::new(SystemctlError::Other(ExitStatus::default(), stdout)))
                } else {
                    Ok(StatusResult::Running)
                }
            },

            Err(e) => {
                // Failed to check if the unit is running
                match systemctl("cat", name, false) { 
                    // "systemctl cat" seems to no have stable exit codes so we need
                    // to check the output if it looks like "No files found for yyyy.service" 
                    // At least, the exit code are not documented for systemd v255 (newest at the time of writing)
                    Err(SystemctlError::Other(status, msg)) => {
                        if msg.contains("No files found for") {
                            Ok(StatusResult::NotFound)
                        } else {
                            Err(Box::new(SystemctlError::Other(status, msg)))
                        }
                    },

                    Err(SystemctlError::IoError(e)) => {
                        match e.kind() {
                            io::ErrorKind::NotFound => Ok(StatusResult::Unsupported),
                            _ => Err(Box::new(e))
                        }
                    },

                    // Any other error type means something went completely wrong while running systemctl altogether.
                    Err(e) => {
                        Err(Box::new(e))
                    },

                    // Fine, systemctl cat worked so if the output is "inactive" we know the service is installed
                    // but stopped.
                    Ok(_) => {
                        // Unit seems to be installed so check the output of result
                        let mut stderr  = e.to_string();
                        trim_newline(&mut stderr);
                        
                        if stderr == "inactive" {
                            Ok(StatusResult::Stopped)
                        } else {
                            Err(Box::new(e)) 
                        }
                    }
                }
            }
        }
    }

    fn start(&self, name: &str) -> Result<StatusResult> {
        // This time we need to run as root through pkexec or similar binaries like kdesudo/gksudo. 
        let result = systemctl("start", name, true);

        match result {
            Ok(_) => {
                // It seems like we managed to start the service in question so try to retreive
                // the current service status just to be sure.
                self.status(name)
            },

            Err(e) => {
                // Just bubble up the error to the caller, we don't really care what
                // happened here...
                Err(Box::new(e))
            }
        }
    }
}


#[cfg(target_os = "linux")]
#[derive(Debug)]
pub enum SystemctlError {
    FromUtf8Error(std::string::FromUtf8Error),
    IoError(io::Error),
    Other(ExitStatus, String)
}

impl std::fmt::Display for SystemctlError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::FromUtf8Error(e) => write!(f, "failed to convert from utf8: {}", e),
            Self::IoError(e) => write!(f, "io error: {}", e),
            Self::Other(e, msg) => write!(f, "{}: {}", e, msg),
        }
    }
}

impl From<io::Error> for SystemctlError {
    fn from(value: io::Error) -> Self {
        SystemctlError::IoError(value)
    }
}

impl std::error::Error for SystemctlError {}

#[cfg(target_os = "linux")]
fn systemctl(cmd: &str, unit: &str, run_as_root: bool) -> std::result::Result<String, SystemctlError> {
    let output = run(run_as_root, SYSTEMCTL, vec![
        cmd,
        unit,
    ]);

    match output {
        Err(e) => Err(SystemctlError::IoError(e)),
        Ok(output) => {
            // The command have been able to run (i.e. has been spawned and executed by the kernel).
            // We now need to check the exit code and "stdout/stderr" output in case of an error.
            if output.status.success() {
                let result: std::prelude::v1::Result<String, std::string::FromUtf8Error> = String::from_utf8(output.stdout);

                match result {
                    Ok(str) => Ok(str),
                    Err(e) => Err(SystemctlError::FromUtf8Error(e))
                }

            } else {
                let msg = String::from_utf8(output.stderr)
                    .ok()
                    .filter(|s| !s.trim().is_empty())
                    .or_else(|| {
                        String::from_utf8(output.stdout)
                            .ok()
                            .filter(|s| !s.trim().is_empty())
                    })
                    .unwrap_or_else(|| format!("Failed to run `systemctl {cmd} {unit}`"));

                Err(SystemctlError::Other(output.status, msg))
            }
        }
    }
}

#[cfg(target_os = "linux")]
fn run<'a>(root: bool, cmd: &'a str, args: Vec<&'a str>) -> std::io::Result<std::process::Output> {
    // clone the args vector so we can insert the actual command in case we're running
    // through pkexec or friends. This is just callled a couple of times on start-up
    // so cloning the vector does not add any mentionable performance impact here and it's better
    // than expecting a mutalble vector in the first place.
    let mut args = args.to_vec();

    let mut command = match root {
        true => {
            // if we run through pkexec we need to append cmd as the first argument.
            args.insert(0, cmd);

            Command::new(PKEXEC)
        },
        false => Command::new(cmd),
    };

    command.env("LC_ALL", "C");

    command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    command.args(args).output()
}

fn trim_newline(s: &mut String) {
    if s.ends_with('\n') {
        s.pop();
        if s.ends_with('\r') {
            s.pop();
        }
    }
}