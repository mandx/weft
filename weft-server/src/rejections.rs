use warp::reject::{custom, Reject, Rejection};

pub trait IntoRejection {
    fn into_rejection(self: Self) -> Rejection;
}

impl<E> IntoRejection for E
where
    E: Reject,
{
    fn into_rejection(self: Self) -> Rejection {
        custom(self)
    }
}

// impl IntoRejection for anyhow::Error {
//     fn into_rejection(self: Self) -> Rejection {
//         custom(self)
//     }
// }
