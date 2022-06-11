use std::{env, fmt};

#[derive(Debug, Clone)]
pub struct HashedPassword(String);

impl HashedPassword {
    pub fn as_str(&self) -> &str {
        self.0.as_str()
    }
}

impl std::str::FromStr for HashedPassword {
    type Err = &'static str;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self(s.into()))
    }
}

#[derive(Debug, PartialEq, Eq, thiserror::Error)]
pub enum PasswordHasherError {
    NoSecretKey,
    InvalidSecretKey,
    HashingError(argonautica::Error),
}

impl fmt::Display for PasswordHasherError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}",
            match self {
                PasswordHasherError::NoSecretKey => "No secret key".into(),
                PasswordHasherError::InvalidSecretKey => "Invalid secret key".into(),
                PasswordHasherError::HashingError(error) => format!("Hashing error: {:?}", error),
            }
        )
    }
}

#[derive(Debug)]
pub struct PasswordHasher {
    secret: String,
}

impl PasswordHasher {
    fn validate_secret<S: AsRef<str>>(secret: S) -> Result<S, PasswordHasherError> {
        if secret.as_ref().len() > 30 {
            Ok(secret)
        } else {
            Err(PasswordHasherError::InvalidSecretKey)
        }
    }

    pub fn new<S: AsRef<str>>(secret: S) -> Result<Self, PasswordHasherError> {
        Self::validate_secret(secret).map(|secret| Self {
            secret: secret.as_ref().into(),
        })
    }

    pub fn new_from_env_key() -> Result<Self, PasswordHasherError> {
        env::var("WEFT_SECRET_KEY")
            .map_err(|error| match error {
                env::VarError::NotPresent => PasswordHasherError::NoSecretKey,
                env::VarError::NotUnicode(_) => PasswordHasherError::InvalidSecretKey,
            })
            .and_then(Self::validate_secret)
            .map(|secret| Self { secret })
    }

    pub fn hash_password(&self, password: &str) -> Result<HashedPassword, PasswordHasherError> {
        argonautica::Hasher::default()
            .with_password(password)
            .with_secret_key(self.secret.to_owned())
            .hash()
            .map(HashedPassword)
            .map_err(PasswordHasherError::HashingError)
    }

    pub fn verify_password(
        &self,
        password: &str,
        hashed_password: &HashedPassword,
    ) -> Result<bool, PasswordHasherError> {
        argonautica::Verifier::default()
            .with_password(password.to_owned())
            .with_hash(&hashed_password.0)
            .with_secret_key(self.secret.to_owned())
            .verify()
            .map_err(PasswordHasherError::HashingError)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_SECRET: &'static str = "fogwrtspgvjzaylwogmwnvuximgrqrmdwmtymgbpgfkqkrdgzxkdcvsfqpkzolvklhhtuqaoareiwkrfybdtrdevyrhdksbvwhpltsqbeyplxgumzbchtgryoqukaafvxmnlftanopntxppdxyyttnnhjcxaowly";
    const SHORT_TEST_SECRET: &'static str = "cfkwxxjduqoitbrmbhffgckvcgpuz";

    #[test]
    fn test_build_hasher() {
        assert!(PasswordHasher::new(TEST_SECRET).is_ok())
    }

    #[test]
    fn test_build_hasher_short_key() {
        assert_eq!(
            PasswordHasher::new(SHORT_TEST_SECRET).unwrap_err(),
            PasswordHasherError::InvalidSecretKey
        );
    }

    #[test]
    fn test_hash_password() {
        assert!(PasswordHasher::new(TEST_SECRET)
            .unwrap()
            .hash_password("some-password")
            .is_ok());
    }

    #[test]
    fn test_hash_password_and_verify_it() {
        let password = "some-password";
        let hasher = PasswordHasher::new(TEST_SECRET).unwrap();
        let password_hash = hasher.hash_password(password).unwrap();
        assert!(hasher.verify_password(password, &password_hash).unwrap());
    }
}
