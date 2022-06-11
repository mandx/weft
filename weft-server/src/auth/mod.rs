pub mod passwords;
pub mod tokens;

use std::{convert::TryFrom, fmt, str::FromStr};

use serde::{Deserialize, Serialize};

pub use passwords::{HashedPassword, PasswordHasher, PasswordHasherError};

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

#[derive(Clone, Debug, Deserialize, Serialize, Eq, PartialEq, sqlx::Type)]
pub struct EmailAddress(String);

impl EmailAddress {
    pub fn to_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for EmailAddress {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::str::FromStr for EmailAddress {
    type Err = &'static str;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self(s.into()))
    }
}

/// Credentials used to log in
#[derive(Debug, Deserialize)]
pub struct Credentials {
    email: String,
    password: String,
}

#[derive(Debug)]
pub enum SignupValidationError {
    PasswordMismatch,
    EmptyFullName,
    EmptyPassword,
}

impl fmt::Display for SignupValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}",
            match self {
                SignupValidationError::PasswordMismatch => "Password mismatch",
                SignupValidationError::EmptyFullName => "Empty full name",
                SignupValidationError::EmptyPassword => "Empty password",
            }
        )
    }
}

/// Unvalidated signup info
#[derive(Debug, Deserialize)]
pub struct TempSignup {
    email_address: EmailAddress,
    full_name: String,
    password: String,
    password_confirm: String,
}

impl TryFrom<TempSignup> for Signup {
    type Error = SignupValidationError;

    fn try_from(value: TempSignup) -> Result<Self, Self::Error> {
        if value.full_name.is_empty() {
            return Err(SignupValidationError::EmptyFullName);
        }

        if value.password.is_empty() {
            return Err(SignupValidationError::EmptyPassword);
        }

        if value.password != value.password_confirm {
            return Err(SignupValidationError::PasswordMismatch);
        }

        Ok(Signup {
            email_address: value.email_address,
            full_name: value.full_name,
            password: value.password,
        })
    }
}

/// Signup info
#[derive(Deserialize)]
#[serde(try_from = "TempSignup")]
pub struct Signup {
    email_address: EmailAddress,
    full_name: String,
    password: String,
}

impl fmt::Debug for Signup {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Signup")
            .field("email_address", &self.email_address)
            .field("full_name", &self.full_name)
            .field("password", &"[~password~redacted~]")
            .finish()
    }
}

impl TryFrom<Signup> for NewUser {
    type Error = PasswordHasherError;

    fn try_from(value: Signup) -> Result<Self, Self::Error> {
        Ok(Self {
            email_address: value.email_address,
            full_name: value.full_name,
            hashed_password: PasswordHasher::new_from_env_key()?.hash_password(&value.password)?,
        })
    }
}

#[derive(Debug)]
pub struct NewUser {
    email_address: EmailAddress,
    full_name: String,
    hashed_password: HashedPassword,
}

impl NewUser {
    pub fn new(
        email_address: &EmailAddress,
        full_name: &str,
        password: &str,
    ) -> Result<Self, PasswordHasherError> {
        Ok(Self {
            email_address: email_address.to_owned(),
            full_name: full_name.to_owned(),
            hashed_password: PasswordHasher::new_from_env_key()?.hash_password(password)?,
        })
    }

    pub fn email_address(&self) -> &EmailAddress {
        &self.email_address
    }

    pub fn full_name(&self) -> &str {
        &self.full_name
    }

    pub fn hashed_password(&self) -> &HashedPassword {
        &self.hashed_password
    }
}

/// Response sent when asked for a user profile. Some/most fields might be
/// empty unless the current user asks for its own profile.
#[derive(Debug, Deserialize, Serialize, PartialEq, Eq, Clone)]
pub struct UserProfile {
    pub id: sqlx::types::Uuid,
    pub email_address: EmailAddress,
}

impl UserProfile {
    /// Create a fake, non-save instance, mainly for testing
    pub fn fake_new_for_testing() -> Self {
        Self {
            id: Default::default(),
            email_address: FromStr::from_str("some@email.address").unwrap(),
        }
    }
}
