use std::{convert::TryFrom, fmt, str::FromStr};

use serde::{Deserialize, Serialize};
use sqlx::{
    types::{
        chrono::{DateTime, Utc},
        Uuid,
    },
    Row,
};
use url::Url;

use crate::auth::{EmailAddress, HashedPassword, NewUser, UserProfile};

#[derive(Debug, sqlx::FromRow)]
pub struct User {
    id: sqlx::types::Uuid,
    email_address: EmailAddress,
    full_name: String,
    hashed_password: HashedPassword,
}

impl User {
    pub async fn get_by_id(
        pool: &sqlx::PgPool,
        id: &sqlx::types::Uuid,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query!(
            "SELECT id, email_address, full_name, hashed_password FROM users WHERE id = $1",
            id
        )
        .fetch_optional(pool)
        .await
        .and_then(|maybe_row| match maybe_row {
            Some(row) => Ok(Some(Self {
                id: row.id,
                // TODO: Take care of this unwrap
                // email_address: match EmailAddress::from_str(&row.email_address) {
                email_address: match EmailAddress::from_str(&row.email_address) {
                    Ok(email_address) => email_address,
                    Err(_) => {
                        return Err(sqlx::Error::Decode(
                            format!("Error decoding `{}` as EmailAddress", row.email_address)
                                .into(),
                        ))
                    }
                },
                full_name: row.full_name,
                hashed_password: match HashedPassword::from_str(&row.hashed_password) {
                    Ok(hashed_password) => hashed_password,
                    Err(error) => {
                        return Err(sqlx::Error::Decode(
                            format!("Error decoding hashed password for user `{}`", id).into(),
                        ));
                    }
                },
            })),
            None => Ok(None),
        })
    }

    pub async fn get_by_credentials(
        db_pool: &sqlx::PgPool,
        email: &EmailAddress,
        hashed_password: &str,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query!("SELECT id, email_address, full_name, hashed_password FROM users WHERE email_address = $1 AND hashed_password = $2;",
            email.to_str(),
hashed_password,
            )
            .fetch_optional(db_pool)
            .await
        .and_then(|maybe_row| match maybe_row {
            Some(row) => Ok(Some(Self {
                id: row.id,
                // TODO: Take care of this unwrap
                email_address: match EmailAddress::from_str(&row.email_address) {
                    Ok(email_address) => email_address,
                    Err(_) => {
                        return Err(sqlx::Error::Decode(
                            format!("Error decoding `{}` as EmailAddress", row.email_address)
                                .into(),
                        ))
                    }
                },
                full_name: row.full_name,
                hashed_password: match HashedPassword::from_str(&row.hashed_password) {
                    Ok(hashed_password) => hashed_password,
                    Err(error) => {
                        return Err(sqlx::Error::Decode(
                            format!("Error decoding hashed password for user `{}`", email)
                                .into(),
                        ));
                    }
                },
            })),
            None => Ok(None),
        })
    }

    pub async fn update(&self, db_pool: &sqlx::PgPool) -> Result<Self, sqlx::Error> {
        todo!()
    }

    pub async fn create(db_pool: &sqlx::PgPool, new_user: NewUser) -> Result<Self, sqlx::Error> {
        // ON CONFLICT (email_address)
        // DO
        // UPDATE SET hashed_password = $2

        let result = sqlx::query(
            r#"
INSERT INTO users (email_address, hashed_password)
VALUES ($1, $2)
RETURNING id;"#,
        )
        .bind(new_user.email_address().to_str())
        .bind(new_user.hashed_password().as_str())
        .fetch_one(db_pool)
        .await?;

        Ok(Self {
            id: result.get(0),
            full_name: new_user.full_name().to_string(),
            email_address: new_user.email_address().clone(),
            hashed_password: new_user.hashed_password().clone(),
        })
    }

    pub fn get_profile(&self) -> UserProfile {
        UserProfile {
            id: self.id.clone(),
            email_address: self.email_address.clone(),
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Video {
    user_id: Uuid,
    video_src: Url,
    poster_src: Url,
    title: String,
    uploaded: DateTime<Utc>,
    created: DateTime<Utc>,
    updated: DateTime<Utc>,
}
