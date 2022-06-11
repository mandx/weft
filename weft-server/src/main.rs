use std::{
    collections::HashMap,
    convert::{Infallible, TryFrom, TryInto}};

use anyhow::{Context, Error};
use futures::future::TryFutureExt;
use hyper::server::Server;
use listenfd::ListenFd;
use warp::{Filter, Rejection, Reply};

mod auth;
mod models;
mod rejections;

use crate::auth::{AuthError, AuthToken, UserProfile};

/// Extract user's JWT
pub fn auth_user() -> impl Filter<Extract = (AuthToken,), Error = Rejection> + Copy {
    warp::cookie::cookie("Auth-Token").and_then(|auth_token: String| async move {
        Ok::<_, Rejection>(
            AuthToken::try_from(auth_token)
                .map_err(|_| warp::reject::custom(AuthError::InvalidToken))?,
        )
    })
}

pub async fn load_current_user(
    auth_token: AuthToken,
    db_pool: sqlx::PgPool,
) -> Result<impl Reply, Rejection> {
    Ok(warp::reply::json(&format!(
        "load_current_user : {:?} : {:?}",
        auth_token, db_pool
    )))
}

pub async fn save_current_user(
    auth_token: AuthToken,
    db_pool: sqlx::PgPool,
    payload: UserProfile,
) -> Result<impl Reply, Rejection> {
    Ok(warp::reply::json(&format!(
        "save_current_user : {:?} : {:?} : {:?}",
        auth_token, db_pool, payload,
    )))
}

pub async fn load_user_profile(
    user_handle: String,
    db_pool: sqlx::PgPool,
) -> Result<impl Reply, Rejection> {
    Ok(warp::reply::json(&format!(
        "load_user_profile : {:?} : {:?}",
        user_handle, db_pool
    )))
}

pub async fn signup_user(
    signup: auth::Signup,
    db_pool: sqlx::PgPool,
) -> Result<impl Reply, anyhow::Error> {
    let context_msg = format!("Error creating user out of {:?}", &signup);
    let new_user = signup.try_into().context(context_msg)?;
    let user = models::User::create(&db_pool, new_user).await?;
    Ok(warp::reply::json(&user.get_profile()))
}

pub async fn oauth_start() -> Result<impl Reply, Rejection> {
Ok(warp::reply::with_header("", "some-header-name", "some-header-value"))
}

// pub async fn oauth2_flow() -> Result<impl Reply, Rejection> {
//     yup_oauth2::parse_application_secret()
// }

/// You'll need to install `systemfd` and `cargo-watch`:
/// ```
/// cargo install systemfd cargo-watch
/// ```
/// And run with:
/// ```
/// systemfd --no-pid -s http::3030 -- cargo watch -x 'run --example autoreload'
/// ```
fn main() -> Result<(), Error> {
    let mut runtime = tokio::runtime::Builder::new()
        .threaded_scheduler()
        .enable_all()
        .build()?;

    let google_client_secret = oauth2::ClientSecret::new(std::env::var("GOOGLE_CLIENT_SECRET")?);

    let pool = runtime.block_on(async {
        sqlx::postgres::PgPoolOptions::new().connect_lazy("postgres://localhost")
    })?;

    let with_database = warp::any().map(move || pool.clone());
    let with_google_client_secret = warp::any().map(move || google_client_secret.clone());

    let current_user_path = warp::path("user")
        .and(warp::path::end())
        .and(auth_user())
        .and(with_database.clone());
    let get_current_user = current_user_path
        .clone()
        .and(warp::get())
        .and_then(load_current_user);
    let update_current_user = current_user_path
        .and(warp::post())
        .and(warp::body::content_length_limit(1024 * 32))
        .and(warp::body::json())
        .and_then(save_current_user);

    let current_user_routes = get_current_user.or(update_current_user);

    let profile_user_path = warp::path("user")
        .and(warp::path::param())
        .and(warp::path::end());
    let public_profile = profile_user_path
        .clone()
        .and(with_database.clone())
        .and_then(load_user_profile);

    let user_session_routes = warp::path("signup")
        .and(warp::path::end())
        .and(warp::post())
        .and(warp::body::content_length_limit(1024 * 32))
        .and(warp::body::json())
        .and(with_database.clone())
        .and_then(|signup: auth::Signup, db_pool: sqlx::PgPool| {
            signup_user(signup, db_pool).map_err(|_| warp::reject::reject())
            // Ok(signup_user(signup, db_pool).unwrap()).into()
        });

    // let user_oauth_routes = warp::path("oauth2")
    //     .and(warp::path("google"))
    //     .and(warp::path::end())
    //     .and
    let oauth_route_prefix = warp::path("oauth2").and(warp::path("google"));
    let oauth_start_route = oauth_route_prefix.and(warp::path("start")).and(warp::path::end()).and_then(oauth_start);
    // let oauth_end = oauth2_route_prefix.and(warp::path("end")).and(warp::path::end())
    //     .and(warp::get())
    //     .and(warp::query::<HashMap<String, String>>())
    //     .and_then(|| {})

    let all_routes = warp::path("api").and(warp::path("v1")).and(
        current_user_routes
            .or(public_profile)
            .or(user_session_routes),
    );

    /**************************************************************************
     *  Server setup
     */

    // hyper lets us build a server from a TcpListener (which will be
    // useful shortly). Thus, we'll need to convert our `warp::Filter` into
    // a `hyper::service::MakeService` for use with a `hyper::server::Server`.
    let service = warp::service(
        all_routes
            // .recover(problem::unpack) // TODO
            .with(
                warp::cors()
                    .allow_methods(vec!["GET", "POST", "PUT"])
                    .allow_header("content-type")
                    .allow_header("authorization")
                    .allow_any_origin()
                    .build(),
            )
            .with(warp::log("weft::request")),
    );

    let make_service = hyper::service::make_service_fn(|_| {
        // the clone is there because not all warp filters impl Copy
        let service = service.clone();
        async move { Ok::<_, Infallible>(service) }
    });

    runtime.block_on(async {
        Ok::<_, Error>({
            // if listenfd doesn't take a TcpListener (i.e. we're not running via
            // the command above), we fall back to explicitly binding to a given
            // host:port.
            let server = if let Some(listener) = ListenFd::from_env().take_tcp_listener(0)? {
                Server::from_tcp(listener)?
            } else {
                Server::bind(&([127, 0, 0, 1], 3030).into())
            };

            server.serve(make_service).await
        })
    })??;

    Ok(())
}
