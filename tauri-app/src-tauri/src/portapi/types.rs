
use super::message::*;

#[derive(PartialEq, Debug)]
pub enum Request {
    Get(String),
    Query(String),
    Subscribe(String),
    QuerySubscribe(String),
    Create(String, Payload),
    Update(String, Payload),
    Insert(String, Payload),
    Delete(String),
    Cancel,
}

impl std::convert::TryFrom<Message> for Request {
    type Error = DeserializeError;

    fn try_from(value: Message) -> Result<Self, Self::Error> {
        match value.cmd.as_str() {
            "get" => {
                let key = value.key.ok_or(DeserializeError::MissingKey)?;
                Ok(Request::Get(key))
            },
            "query" => {
                let key = value.key.ok_or(DeserializeError::MissingKey)?;
                Ok(Request::Query(key))
            },
            "sub" => {
                let key = value.key.ok_or(DeserializeError::MissingKey)?;
                Ok(Request::Subscribe(key))
            },
            "qsub" => {
                let key = value.key.ok_or(DeserializeError::MissingKey)?;
                Ok(Request::QuerySubscribe(key))
            },
            "create" => {
                let key = value.key.ok_or(DeserializeError::MissingKey)?;
                let payload = value.payload.ok_or(DeserializeError::MissingPayload)?;
                Ok(Request::Create(key, payload))
            },
            "update" => {
                let key = value.key.ok_or(DeserializeError::MissingKey)?;
                let payload = value.payload.ok_or(DeserializeError::MissingPayload)?;
                Ok(Request::Update(key, payload))
            },
            "insert" => {
                let key = value.key.ok_or(DeserializeError::MissingKey)?;
                let payload = value.payload.ok_or(DeserializeError::MissingPayload)?;
                Ok(Request::Insert(key, payload))
            },
            "delete" => {
                let key = value.key.ok_or(DeserializeError::MissingKey)?;
                Ok(Request::Delete(key))
            },
            "cancel" => {
                Ok(Request::Cancel)
            },
            &_ => {
                Err(DeserializeError::UnknownCommand)
            }
        }     
    }
}

impl std::convert::TryFrom<Request> for Message {
    type Error = DeserializeError;

    fn try_from(value: Request) -> Result<Self, Self::Error> {
        match value {
            Request::Get(key) => Ok(Message { id: 0, cmd: "get".to_string(), key: Some(key), payload: None }),
            Request::Query(key) => Ok(Message { id: 0, cmd: "query".to_string(), key: Some(key), payload: None }),
            Request::Subscribe(key) => Ok(Message { id: 0, cmd: "sub".to_string(), key: Some(key), payload: None }),
            Request::QuerySubscribe(key) => Ok(Message { id: 0, cmd: "qsub".to_string(), key: Some(key), payload: None }),
            Request::Create(key, value) => Ok(Message{ id: 0, cmd: "create".to_string(), key: Some(key), payload: Some(value)}),
            Request::Update(key, value) => Ok(Message{ id: 0, cmd: "update".to_string(), key: Some(key), payload: Some(value)}),
            Request::Insert(key, value) => Ok(Message{ id: 0, cmd: "insert".to_string(), key: Some(key), payload: Some(value)}),
            Request::Delete(key) => Ok(Message { id: 0, cmd: "delete".to_string(), key: Some(key), payload: None }),
            Request::Cancel => Ok(Message { id: 0, cmd: "cancel".to_string(), key: None, payload: None }),
        }
    }
}

#[derive(PartialEq, Debug)]
pub enum Response {
    Ok(String, Payload),
    Update(String, Payload),
    New(String, Payload),
    Delete(String),
    Success,
    Error(String),
    Warning(String),
    Done
}

impl std::convert::TryFrom<Message> for Response {
    type Error = DeserializeError;

    fn try_from(value: Message) -> Result<Self, DeserializeError> {
        match value.cmd.as_str() {
            "ok" => {
                let key = value.key.ok_or(DeserializeError::MissingKey)?;
                let payload = value.payload.ok_or(DeserializeError::MissingPayload)?;

                Ok(Response::Ok(key, payload))
            },
            "upd" => {
                let key = value.key.ok_or(DeserializeError::MissingKey)?;
                let payload = value.payload.ok_or(DeserializeError::MissingPayload)?;

                Ok(Response::Update(key, payload))
            },
            "new" => {
                let key = value.key.ok_or(DeserializeError::MissingKey)?;
                let payload = value.payload.ok_or(DeserializeError::MissingPayload)?;

                Ok(Response::New(key, payload))
            },
            "del" => {
                let key = value.key.ok_or(DeserializeError::MissingKey)?;

                Ok(Response::Delete(key))
            },
            "success" => {
                Ok(Response::Success)
            },
            "error" => {
                let key = value.key.ok_or(DeserializeError::MissingKey)?;

                Ok(Response::Error(key))
            },
            "warning" => {
                let key = value.key.ok_or(DeserializeError::MissingKey)?;

                Ok(Response::Warning(key))
            },
            "done" => {
                Ok(Response::Done)
            },
            &_ => Err(DeserializeError::UnknownCommand)
        }
    }
}

impl std::convert::TryFrom<Response> for Message {
    type Error = DeserializeError;

    fn try_from(value: Response) -> Result<Self, Self::Error> {
        match value {
            Response::Ok(key, payload) => Ok(Message{id: 0, cmd: "ok".to_string(), key: Some(key), payload: Some(payload)}),
            Response::Update(key, payload) => Ok(Message{id: 0, cmd: "upd".to_string(), key: Some(key), payload: Some(payload)}),
            Response::New(key, payload) => Ok(Message{id: 0, cmd: "new".to_string(), key: Some(key), payload: Some(payload)}),
            Response::Delete(key ) => Ok(Message{id: 0, cmd: "del".to_string(), key: Some(key), payload: None}),
            Response::Success => Ok(Message{id: 0, cmd: "success".to_string(), key: None, payload: None}),
            Response::Warning(key) => Ok(Message{id: 0, cmd: "warning".to_string(), key: Some(key), payload: None}),
            Response::Error(key) => Ok(Message{id: 0, cmd: "error".to_string(), key: Some(key), payload: None}),
            Response::Done => Ok(Message{id: 0, cmd: "done".to_string(), key: None, payload: None}),
        }
    }
}


#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub struct Record {
    pub created: u64,
    pub deleted: u64,
    pub expires: u64,
    pub modified: u64,
    pub key: String,
}