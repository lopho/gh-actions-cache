export enum Inputs {
    Key = "key",
    Path = "path",
    RestoreKeys = "restore-keys",
    UploadChunkSize = "upload-chunk-size",
    ToHash = "to-hash",
    SkipSave = "skip-save",
    SkipRestore = "skip-restore",
    CheckOnly = "check-only"
}

export enum Outputs {
    CacheHit = "cache-hit"
}

export enum State {
    CacheMatchedKey = "CACHE_RESULT"
}

export enum Events {
    Key = "GITHUB_EVENT_NAME",
    Push = "push",
    PullRequest = "pull_request"
}

export const RefKey = "GITHUB_REF";
