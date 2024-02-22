use serde::*;

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
pub struct ModuleStatus {
    #[serde(alias = "Name")]
    pub name: String,

    #[serde(alias = "Enabled")]
    pub enabled: bool,

    #[serde(alias = "Status")]
    pub status: u8,

    #[serde(alias = "FailureStatus")]
    pub failure_status: u8,

    #[serde(alias = "FailureID")]
    pub failure_id: String,
    
    #[serde(alias = "FailureMsg")]
    pub failure_msg: String
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Clone)]
pub struct Subsystem {
    #[serde(alias = "ID")]
    pub id: String,

    #[serde(alias = "Name")]
    pub name: String,

    #[serde(alias = "Description")]
    pub description: String,

    #[serde(alias = "Modules")]
    pub module_status: Vec<ModuleStatus>,

    #[serde(alias = "FailureStatus")]
    pub failure_status: u8
}

pub const FAILURE_NONE: u8 = 0;
pub const FAILURE_HINT: u8 = 1;
pub const FAILURE_WARNING: u8 = 2;
pub const FAILURE_ERROR: u8 = 3;