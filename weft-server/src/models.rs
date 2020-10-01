use std::str::FromStr;

use crate::auth::UserProfile;
use serde::{Deserialize, Serialize};
use sqlx::{
    types::{
        chrono::{DateTime, Utc},
        Uuid,
    },
    Row,
};
use url::Url;

#[derive(Clone, Debug, Deserialize, Serialize, sqlx::Type)]
pub struct EmailAddress(String);

impl EmailAddress {
    pub fn to_str(&self) -> &str {
        &self.0
    }
}

impl FromStr for EmailAddress {
    type Err = &'static str;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self(s.into()))
    }
}

#[derive(Debug)]
pub struct NewUser {
    email_address: EmailAddress,
    hashed_password: String,
}

#[derive(Debug, Deserialize, sqlx::FromRow)]
pub struct User {
    id: sqlx::types::Uuid,
    email_address: EmailAddress,
    hashed_password: String,
}

impl User {
    pub async fn get_by_id(
        pool: &sqlx::PgPool,
        id: &sqlx::types::Uuid,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as("SELECT id, email_address, hashed_password FROM users WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await
    }

    pub async fn get_by_credentials(
        pool: &sqlx::PgPool,
        email: &EmailAddress,
        hashed_password: &str,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_as("SELECT id, email_address, hashed_password FROM users WHERE email_address = ? AND hashed_password = ?;")
            .bind(email.to_str())
            .bind(hashed_password)
            .fetch_optional(pool)
            .await
    }

    pub async fn save(new_user: &NewUser, pool: &sqlx::PgPool) -> Result<Self, sqlx::Error> {
        let result = sqlx::query(
            r#"
INSERT INTO users (email_address, hashed_password)
VALUES ($1, $2)
ON CONFLICT (email_address)
DO
UPDATE SET hashed_password = $2
RETURNING id;
            "#,
        )
        .bind(new_user.email_address.to_str())
        .bind(new_user.hashed_password.as_str())
        .fetch_one(pool)
        .await?;

        Ok(Self {
            id: result.get(0),
            email_address: new_user.email_address.clone(),
            hashed_password: new_user.hashed_password.clone(),
        })
    }

    pub fn get_profile(&self) -> UserProfile {
        UserProfile {
            id: self.id.clone(),
            email_address: self.email_address.clone(),
            videos: Default::default(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct Video {
    user_id: Uuid,
    video_src: Url,
    poster_src: Url,
    name: String,
    uploaded: DateTime<Utc>,
    created: DateTime<Utc>,
    updated: DateTime<Utc>,
}
