// pub mod manager;
pub mod status;

#[cfg(target_os = "linux")]
mod systemd;

use std::process::ExitStatus;

#[cfg(target_os = "linux")]
use crate::service::systemd::SystemdServiceManager;

use thiserror::Error;

use self::status::StatusResult;

#[allow(dead_code)]
#[derive(Error, Debug)]
pub enum ServiceManagerError {
    #[error("unsupported service manager")]
    UnsupportedServiceManager,

    #[error("unsupported operating system")]
    UnsupportedOperatingSystem,

    #[error(transparent)]
    FromUtf8Error(#[from] std::string::FromUtf8Error),

    #[error(transparent)]
    IoError(#[from] std::io::Error),

    #[error("{0} output={1}")]
    Other(ExitStatus, String),
}

pub type Result<T> = std::result::Result<T, ServiceManagerError>;

/// A common interface to the system manager service (might be systemd, openrc, sc.exe, ...)
pub trait ServiceManager {
    fn status(&self) -> Result<StatusResult>;
    fn start(&self) -> Result<StatusResult>;
}

struct EmptyServiceManager();

impl ServiceManager for EmptyServiceManager {
    fn status(&self) -> Result<StatusResult> {
        Err(ServiceManagerError::UnsupportedServiceManager)
    }

    fn start(&self) -> Result<StatusResult> {
        Err(ServiceManagerError::UnsupportedServiceManager)
    }
}

pub fn get_service_manager() -> Result<impl ServiceManager> {
    #[cfg(target_os = "linux")]
    {
        if SystemdServiceManager::is_installed() {
            eprintln!("system service manager: systemd");

            Ok(SystemdServiceManager {})
        } else {
            Err(ServiceManagerError::UnsupportedServiceManager)
        }
    }

    #[cfg(not(target_os = "linux"))]
    Err::<EmptyServiceManager, ServiceManagerError>(ServiceManagerError::UnsupportedOperatingSystem)
}
