use std::{collections::HashMap, ops::Deref, sync::{atomic::{AtomicUsize, Ordering, AtomicBool}, Arc}};
use futures_util::{SinkExt, StreamExt};
use tokio::sync::{RwLock, mpsc::{Sender, Receiver, channel}};
use tokio::task::JoinHandle;
use tokio_websockets::{ClientBuilder, Error};
use http::Uri;

use super::types::*;
use super::message::*;

struct Command {
    msg: Message,
    response: Sender<Response>
}

#[derive(Clone)]
pub struct PortAPI{
    dispatch: Sender<Command>,
}

type SubscriberMap = RwLock<HashMap<usize, Sender<Response>>>;

pub async fn connect(uri: &str) -> Result<PortAPI, Error> {
    let parsed = match uri.parse::<Uri>() {
        Ok(u) => u,
        Err(e) => {
            return Err(Error::NoUriConfigured) // TODO(ppacher): fix the return error type.
        }
    };

    let (mut client, _) = ClientBuilder::from_uri(parsed).connect().await?;
    let (tx, mut dispatch) = channel::<Command>(64);

    tokio::spawn(async move {
        let subscribers: SubscriberMap = RwLock::new(HashMap::new());
        let next_id = AtomicUsize::new(0);

        loop {
            tokio::select! {
                Some(msg) = client.next() => {
                    match msg {
                        Err(err) => {
                            eprintln!("failed to receive frame from websocket: {}", err);

                            return;
                        },
                        Ok(msg) => {
                            let text = unsafe {
                                std::str::from_utf8_unchecked(msg.as_payload())
                            };

                            #[cfg(debug_assertions)]
                            eprintln!("Received websocket frame: {}", text);

                            match text.parse::<Message>() {
                                Ok(msg) => {
                                    let id = msg.id;
                                    let map = subscribers
                                        .read()
                                        .await;

                                    if let Some(sub) = map.get(&id) {
                                        let res: Result<Response, DeserializeError> = msg.try_into();
                                        match res {
                                            Ok(response) => {
                                                if let Err(_) = sub.send(response).await {
                                                    // The receiver side has been closed already,
                                                    // drop the read lock and remove the subscriber
                                                    // from our hashmap
                                                    drop(map);

                                                    subscribers
                                                        .write()
                                                        .await
                                                        .remove(&id);

                                                    #[cfg(debug_assertions)]
                                                    eprintln!("subscriber for command {} closed read side", id);
                                                }
                                            },
                                            Err(err) => {
                                                eprintln!("invalid command: {}", err);
                                            }
                                        }
                                    }
                                },
                                Err(err) => {
                                    eprintln!("failed to deserizalize message: {}", err)
                                }
                            }
                        }
                    }

                },

                Some(mut cmd) = dispatch.recv() => {
                    let id = next_id.fetch_add(1, Ordering::Relaxed);
                    cmd.msg.id = id;
                    let blob: String = cmd.msg.into();
                    
                    #[cfg(debug_assertions)]
                    eprintln!("Sending websocket frame: {}", blob);

                    match client.send(tokio_websockets::Message::text(blob)).await {
                        Ok(_) => {
                            subscribers
                                .write()
                                .await
                                .insert(id, cmd.response);
                        },
                        Err(err) => {
                            eprintln!("failed to dispatch command: {}", err);

                            // TODO(ppacher): we should send some error to cmd.response here.
                            // Otherwise, the sender of cmd might get stuck waiting for responses
                            // if they don't check for PortAPI.is_closed().

                            return
                        }
                    }
                }
            }
        }
    });

    Ok(PortAPI { dispatch: tx })
}


impl PortAPI {
    pub async fn request(&self, r: Request) -> std::result::Result<Receiver<Response>, DeserializeError> {
        self.request_buffer(r, 64).await
    }

    pub async fn request_buffer(&self, r: Request, buffer: usize) -> std::result::Result<Receiver<Response>, DeserializeError> {
        let (tx, rx) = channel(buffer);

        let msg: Message = r.try_into()?;

        let _ = self.dispatch.send(Command{
            response: tx,
            msg: msg,
        }).await;

        Ok(rx)
    }

    pub fn is_closed(&self) -> bool {
        self.dispatch.is_closed()
    }
}