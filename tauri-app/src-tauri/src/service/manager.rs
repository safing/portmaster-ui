use std::process::{Command, Stdio, ExitStatus};
use std::{fs, io};

use thiserror::Error;

#[cfg(target_os = "linux")]
use std::os::unix::fs::PermissionsExt;

use super::status::StatusResult;

static SYSTEMCTL: &str = "systemctl";
// TODO(ppacher): add support for kdesudo and gksudo

enum SudoCommand {
    Pkexec,
    Gksu,
}

pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

/// A common interface to the system manager service (might be systemd, openrc, sc.exe, ...)
pub trait ServiceManager {
    fn status(&self) -> Result<StatusResult>;
    fn start(&self) -> Result<StatusResult>;
}

#[cfg(target_os = "linux")]
#[derive(Error, Debug)]
pub enum SystemctlError {
    #[error(transparent)]
    FromUtf8Error(#[from] std::string::FromUtf8Error),

    #[error(transparent)]
    IoError(#[from] io::Error),

    #[error("{0} output={1}")]
    Other(ExitStatus, String)
}

impl From<std::process::Output> for SystemctlError {
    fn from(output: std::process::Output) -> Self {
        let msg = String::from_utf8(output.stderr)
            .ok()
            .filter(|s| !s.trim().is_empty())
            .or_else(|| {
                String::from_utf8(output.stdout)
                    .ok()
                    .filter(|s| !s.trim().is_empty())
            })
            .unwrap_or_else(|| format!("Failed to run `systemctl`"));

        SystemctlError::Other(output.status, msg)
    }
}

/// System Service manager implementation for Linux based distros.
#[cfg(target_os = "linux")]
pub struct SystemdServiceManager {}

impl SystemdServiceManager {
    /// Checks if systemctl is available in /sbin/ /bin, /usr/bin or /usr/sbin.
    ///
    /// Note that we explicitly check those paths to avoid returning true in case
    /// there's a systemctl binary in the cwd and PATH includes . since this may
    /// pose a security risk of running an untrusted binary with root privileges.
    pub fn is_installed() -> bool {
        let paths = vec![
            "/sbin/systemctl",
            "/bin/systemctl",
            "/usr/sbin/systemctl",
            "/usr/bin/systemctl",
        ];

        for path in paths {
            #[cfg(debug_assertions)]
            eprintln!("checking for systemctl at path {}", path);

            match fs::metadata(path) {
                Ok(md) => {
                    eprintln!("found systemctl at path {} ", path);

                    if md.is_file() && md.permissions().mode() & 0o111 != 0 {
                        return true
                    }

                    eprintln!("systemctl binary found but invalid permissions: {}", md.permissions().mode().to_string());
                },
                Err(err) => {
                    eprintln!("failed to check systemctl binary at {}: {}", path, err.to_string());

                    continue
                },
            };
        }

        eprintln!("failed to find systemctl binary");

        false
    }
}

impl ServiceManager for SystemdServiceManager {
    fn status(&self) -> Result<StatusResult> {
        let name = "portmaster.service";
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
                if let SystemctlError::Other(_err, ref output) = e {
                    let mut copy = output.to_owned();
                    trim_newline(&mut copy);

                    if copy == "inactive" {
                        return Ok(StatusResult::Stopped)
                    }
                } else {
                    eprintln!("failed to run 'systemctl is-active': {}", e.to_string());
                }

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

    fn start(&self) -> Result<StatusResult> {
        let name = "portmaster.service";

        // This time we need to run as root through pkexec or similar binaries like kdesudo/gksudo. 
        systemctl("start", name, true)?;

        // Check the status again to be sure it's started now
        self.status()
    }
}

#[cfg(target_os = "linux")]
fn systemctl(cmd: &str, unit: &str, run_as_root: bool) -> std::result::Result<String, SystemctlError> {
    let output = run(run_as_root, SYSTEMCTL, vec![
        cmd,
        unit,
    ])?;

    // The command have been able to run (i.e. has been spawned and executed by the kernel).
    // We now need to check the exit code and "stdout/stderr" output in case of an error.
    if output.status.success() {
        Ok(
            String::from_utf8(output.stdout)?
        )
    } else {
        Err(output.into())
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
            // if we run through pkexec and friends we need to append cmd as the second argument.

            args.insert(0, cmd);
            match get_sudo_cmd() {
                Ok(cmd) => {
                    match cmd {
                        SudoCommand::Pkexec => {
                            // disable the internal text-based prompt agent from pkexec because it won't work anyway.
                            args.insert(0, "--disable-internal-agent");
                            Command::new("/usr/bin/pkexec")
                        },
                        SudoCommand::Gksu  => {
                            args.insert(0, "--message=Please enter your password:");
                            args.insert(1, "--sudo-mode");

                            Command::new("/usr/bin/gksudo")
                        }
                    }
                },
                Err(err) => {
                    return Err(err)
                }
            }
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

fn get_sudo_cmd() -> std::result::Result<SudoCommand, std::io::Error> {
    if let Ok(_) = fs::metadata("/usr/bin/pkexec") {
        return Ok(SudoCommand::Pkexec)
    }

    if let Ok(_) = fs::metadata("/usr/bin/gksudo") {
        return Ok(SudoCommand::Gksu)
    }

    Err(std::io::Error::new(io::ErrorKind::NotFound, "failed to detect sudo command"))
}