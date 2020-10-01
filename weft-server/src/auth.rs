use std::{convert::TryFrom, fmt};

use serde::{Deserialize, Serialize};

use crate::models::EmailAddress;

#[derive(Debug)]
pub struct AuthToken(String);

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    MissingToken,
    InvalidToken,
}

impl warp::reject::Reject for AuthError {}

impl fmt::Display for AuthError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "Auth error: ")?;
        write!(
            formatter,
            "{}",
            match self {
                AuthError::MissingToken => "Missing token",
                AuthError::InvalidToken => "Invalid token",
            }
        )
    }
}
impl TryFrom<String> for AuthToken {
    type Error = String;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        Ok(Self(value))
    }
}

/// Credentials used to log in
#[derive(Debug, Deserialize)]
pub struct Credentials {
    email: String,
    password: String,
}

/// Response sent when asked for a user profile. Some/most fields might be
/// empty unless the current user asks for its own profile.
#[derive(Debug, Deserialize, Serialize)]
pub struct UserProfile {
    pub id: sqlx::types::Uuid,
    pub email_address: EmailAddress,
    pub videos: Vec<()>,
}
