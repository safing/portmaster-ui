#[derive(Debug)]
pub enum DeserializeError {
    MissingID,
    InvalidID,
    MissingCommand,
    MissingKey,
    MissingPayload,
    InvalidPayload(serde_json::Error),
    UnknownCommand,
}

impl std::fmt::Display for DeserializeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DeserializeError::InvalidID => write!(f, "invalid id"),
            DeserializeError::MissingID => write!(f, "missing id"),
            DeserializeError::MissingCommand => write!(f, "missing command"),
            DeserializeError::MissingKey => write!(f, "missing key"),
            DeserializeError::MissingPayload => write!(f, "missing payload"),
            DeserializeError::InvalidPayload(err) => write!(f, "invalid payload: {}", err.to_string()),
            DeserializeError::UnknownCommand => write!(f, "unknown command"),
        }
    }
}

#[derive(PartialEq, Debug, Clone)]
pub enum Payload {
    JSON(String),
    UNKNOWN(String),
}

#[derive(Debug)]
pub enum ParseError {
    JSON(serde_json::Error),
    UNKNOWN
}

impl std::convert::From<serde_json::Error> for ParseError {
    fn from(value: serde_json::Error) -> Self {
        ParseError::JSON(value)
    }
}

impl Payload {
    pub fn parse<'a, T>(self: &'a Self) -> std::result::Result<T, ParseError> 
    where
        T: serde::de::Deserialize<'a> {

        match self {
            Payload::JSON(blob) => Ok(serde_json::from_str::<T>(blob.as_str())?),
            Payload::UNKNOWN(_) => Err(ParseError::UNKNOWN),
        }
    }
}

impl std::convert::From<String> for Payload {
    fn from(value: String) -> Payload {
        let mut chars = value.chars();
        let first = chars.next();
        let rest = chars.as_str().to_string();

        match first {
            Some(c) => match c {
                'J' => Payload::JSON(rest),
                _ => Payload::UNKNOWN(value),
            },
            None => Payload::UNKNOWN("".to_string())
        }
    }
}

impl std::fmt::Display for Payload {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Payload::JSON(payload) => {
                write!(f, "J{}", payload)
            },
            Payload::UNKNOWN(payload) => {
                write!(f, "{}", payload)
            }
        }
    }
}

#[derive(PartialEq, Debug, Clone)]
pub struct Message {
    pub id: usize,
    pub cmd: String,
    pub key: Option<String>,
    pub payload: Option<Payload>,
}

impl std::convert::From<Message> for String {
    fn from(value: Message) -> Self {
        let mut result = "".to_owned();

        result.push_str(value.id.to_string().as_str());
        result.push_str("|");
        result.push_str(&value.cmd);

        if let Some(key) = value.key {
            result.push_str("|");
            result.push_str(key.as_str());
        }

        if let Some(payload) = value.payload {
            result.push_str("|");
            result.push_str(payload.to_string().as_str())
        }

        result
    }
}

impl std::str::FromStr for Message {
    type Err = DeserializeError;

    fn from_str(line: &str) -> Result<Self, Self::Err> {
        let parts = line.split("|").collect::<Vec<&str>>();

        let id = match parts.get(0) {
            Some(s) => match (*s).parse::<usize>() {
                Ok(id) => Ok(id),
                Err(_) => Err(DeserializeError::InvalidID),
            },
            None => Err(DeserializeError::MissingID),
        }?;

        let cmd = match parts.get(1) {
            Some(s) => Ok(*s),
            None => Err(DeserializeError::MissingCommand),
        }?
        .to_string();

        let key = parts.get(2)
            .and_then(|key| Some(key.to_string()));

        let payload : Option<Payload> = parts.get(3)
            .and_then(|p| Some(p.to_string().into()));

        return Ok(Message {
            id,
            cmd,
            key,
            payload: payload
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Deserialize;


    #[derive(Debug, PartialEq, Deserialize)]
    struct Test {
        a: i64,
        s: String,
    }

    #[test]
    fn payload_to_string() {
        let p = Payload::JSON("{}".to_string());
        assert_eq!(p.to_string(), "J{}");

        let p = Payload::UNKNOWN("some unknown content".to_string());
        assert_eq!(p.to_string(), "some unknown content");
    }

    #[test]
    fn payload_from_string() {
        let p: Payload = "J{}".to_string().into();
        assert_eq!(p, Payload::JSON("{}".to_string()));

        let p: Payload = "some unknown content".to_string().into();
        assert_eq!(p, Payload::UNKNOWN("some unknown content".to_string()));
    }

    #[test]
    fn payload_parse() {
        let p: Payload = "J{\"a\": 100, \"s\": \"string\"}".to_string().into();

        let t: Test = p.parse()
            .expect("Expected payload parsing to work");

        assert_eq!(t, Test{
            a: 100,
            s: "string".to_string(),
        });
    }

    #[test]
    fn parse_message() {
        let m = "10|insert|some:key|J{}".parse::<Message>()
            .expect("Expected message to parse");

        assert_eq!(m, Message{
            id: 10,
            cmd: "insert".to_string(),
            key: Some("some:key".to_string()),
            payload: Some(Payload::JSON("{}".to_string())),
        });

        let m = "1|done".parse::<Message>()
            .expect("Expected message to parse");

        assert_eq!(m, Message{
            id: 1,
            cmd: "done".to_string(),
            key: None,
            payload: None
        });

        let m = "".parse::<Message>()
            .expect_err("Expected parsing to fail");
        if let DeserializeError::InvalidID = m {} else {
            panic!("unexpected error value: {}", m)
        }

        let m = "1".parse::<Message>()
            .expect_err("Expected parsing to fail");

        if let DeserializeError::MissingCommand = m {} else {
            panic!("unexpected error value: {}", m)
        }
    }
}
