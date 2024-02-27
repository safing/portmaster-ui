pub mod manager;
pub mod status;

use thiserror::Error;

use manager::{ServiceManager, SystemdServiceManager};

#[derive(Error, Debug)]
pub enum ServiceManagerError {
    #[error("unsupported service manager")]
    UnsupportedServiceManager,

    #[error("unsupported operating system")]
    UnsupportedOperatingSystem
}

pub type Result<T> = std::result::Result<T, ServiceManagerError>;

pub fn get_service_manager() -> Result<impl ServiceManager> {
    #[cfg(target_os = "linux")]
    {
        if SystemdServiceManager::is_installed() {
            eprintln!("system service manager: systemd");

            Ok(SystemdServiceManager{})
        } else {
            Err(ServiceManagerError::UnsupportedServiceManager)
        }
    }

    #[cfg(not(target_os = "linux"))]
    Err(ServiceManagerError::UnsupportedOperatingSystem)
}
