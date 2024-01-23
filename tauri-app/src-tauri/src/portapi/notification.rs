use serde::*;

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct Notification {
    #[serde(alias = "EventID")]
    pub event_id: String,

    #[serde(alias = "GUID")]
    pub guid: String,

    #[serde(alias = "Type")]
    pub notification_type: NotificationType,

    #[serde(alias = "Message")]
    pub message: String,

    #[serde(alias = "Title")]
    pub title: String,
    #[serde(alias = "Category")]
    pub category: String,

    #[serde(alias = "EventData")]
    pub data: serde_json::Value,

    #[serde(alias = "Expires")]
    pub expires: u64,

    #[serde(alias = "State")]
    pub state: String,

    #[serde(alias = "AvailableActions")]
    pub actions: Vec<Action>,

    #[serde(alias = "SelectedActionID")]
    pub selected_action_id: String,

    #[serde(alias = "ShowOnSystem")]
    pub show_on_system: bool,
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct NotificationType(i32);

pub const INFO: NotificationType = NotificationType(0);
pub const WARN: NotificationType = NotificationType(1);
pub const PROMPT: NotificationType = NotificationType(2);
pub const ERROR: NotificationType = NotificationType(3);

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct Action {
    #[serde(alias = "ID")]
    pub id: String,

    #[serde(alias = "Text")]
    pub text: String,

    #[serde(alias = "Type")]
    pub action_type: String,

    #[serde(alias = "Payload")]
    pub payload: serde_json::Value,
}

impl Notification {
    pub fn is_info(self) -> bool {
        self.notification_type == INFO
    }

    pub fn is_warning(self) -> bool {
        self.notification_type == WARN
    }

    pub fn is_prompt(self) -> bool {
        self.notification_type == PROMPT
    }

    pub fn is_error(self) -> bool {
        self.notification_type == ERROR
    }
}