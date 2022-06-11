use std::env;

pub use biscuit::errors::Error as JwtError;
use biscuit::{
    jwa::SignatureAlgorithm,
    jws::{RegisteredHeader, Secret},
    ClaimsSet, Empty, JWT,
};
use serde::{de::DeserializeOwned, Serialize};

const SIGNATURE_ALGORITHM: SignatureAlgorithm = SignatureAlgorithm::HS256;

pub struct TokenManager {
    secret: Secret,
}

impl TokenManager {
    pub fn new<S: AsRef<str>>(secret: S) -> Self {
        Self {
            secret: Secret::Bytes(secret.as_ref().to_string().into_bytes()),
        }
    }

    pub fn new_from_env_key() -> Result<Self, JwtError> {
        env::var("WEFT_SECRET_KEY")
            .map_err(|error| JwtError::GenericError(format!("{:?}", error)))
            .map(Self::new)
    }

    pub fn create_token<T>(&self, claims: T) -> Result<String, JwtError>
    where
        T: Serialize + DeserializeOwned,
    {
        JWT::new_decoded(
            From::from(RegisteredHeader {
                algorithm: SIGNATURE_ALGORITHM,
                ..Default::default()
            }),
            ClaimsSet {
                private: claims,
                registered: Default::default(),
            },
        )
        .into_encoded(&self.secret)?
        .encoded()
        .map(ToString::to_string)
    }

    pub fn verify_token<S, T>(&self, token: S) -> Result<T, JwtError>
    where
        S: AsRef<str>,
        T: Serialize + DeserializeOwned,
    {
        JWT::<T, Empty>::new_encoded(token.as_ref())
            .into_decoded(&self.secret, SIGNATURE_ALGORITHM)
            .map(|decoded| decoded.unwrap_decoded().1.private)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_SECRET: &'static str = "fogwrtspgvjzaylwogmwnvuximgrqrmdwmtymgbpgfkqkrdgzxkdcvsfqpkzolvklhhtuqaoareiwkrfybdtrdevyrhdksbvwhpltsqbeyplxgumzbchtgryoqukaafvxmnlftanopntxppdxyyttnnhjcxaowly";
    use super::super::UserProfile;

    #[test]
    fn test_encode_plus_verify() {
        let manager = TokenManager::new(TEST_SECRET);
        let profile = UserProfile::fake_new_for_testing();

        // println!(
        //     "{:?}",
        //     base64::encode(&TEST_SECRET.to_string().into_bytes())
        // );

        let encoded_token = manager.create_token(profile.clone()).unwrap();
        let decoded_profile = manager.verify_token(encoded_token).unwrap();
        assert_eq!(profile, decoded_profile);
    }
}
