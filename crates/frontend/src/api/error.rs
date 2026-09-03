//! API 错误模型（方案 §7 / §11）。
//!
//! Status 携带冻结契约的错误码语义：400 参数、401/403 传输层、404 不存在/归属不符、
//! 409 幂等冲突/非法状态/无 binding、500 存储、502 执行失败（`apps/local-service/src/main.rs:208-229`）。

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ApiError {
    Timeout,
    Network(String),
    Status(u16, String),
    Decode(String),
}

impl ApiError {
    /// 重试判定（方案 §7）：幂等写可安全重发同键同体；GET 可重试；409 一律不重试进入冲突处理；
    /// 502 不自动重发（执行已失败并落账）。
    pub fn retryable(&self) -> bool {
        match self {
            ApiError::Timeout | ApiError::Network(_) => true,
            ApiError::Status(code, _) => matches!(code, 500 | 502 | 503),
            ApiError::Decode(_) => false,
        }
    }

    /// 409 必须进入幂等冲突卡（方案 §6.4/§9.4），禁止静默重试。
    pub fn is_idempotency_conflict(&self) -> bool {
        matches!(self, ApiError::Status(409, _))
    }
}
