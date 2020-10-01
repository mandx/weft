use std::convert::{Infallible, TryFrom};

use anyhow::Error;
use hyper::server::Server;
use listenfd::ListenFd;
use warp::{Filter, Rejection, Reply};

mod auth;
mod models;

use crate::auth::{AuthError, AuthToken, UserProfile};

/// Extract valid user JWT
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

    let pool = runtime.block_on(async {
        sqlx::postgres::PgPoolOptions::new().connect_lazy("postgres://localhost")
    })?;

    let with_database = warp::any().map(move || pool.clone());

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

    let all_routes = warp::path("api")
        .and(warp::path("v1"))
        .and(current_user_routes.or(public_profile));

    /**************************************************************************
     *  Server setup
     */

    // hyper lets us build a server from a TcpListener (which will be
    // useful shortly). Thus, we'll need to convert our `warp::Filter` into
    // a `hyper::service::MakeService` for use with a `hyper::server::Server`.
    let service = warp::service(all_routes);

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
