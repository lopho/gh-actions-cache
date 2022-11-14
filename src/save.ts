import * as cache from "@actions/cache"
import * as core from "@actions/core"
import { hashFiles } from "@actions/glob"

import { Events, Inputs, State } from "./constants"
import * as utils from "./utils/actionUtils"

// Catch and log any unhandled exceptions.  These exceptions can leak out of the uploadChunk method in
// @actions/toolkit when a failed upload closes the file descriptor causing any in-process reads to
// throw an uncaught exception.  Instead of failing this action, just warn.
process.on("uncaughtException", e => utils.logWarning(e.message))

async function run(): Promise<void> {
    try {
        if (!utils.isCacheFeatureAvailable()) {
            return
        }

        if (!utils.isValidEvent()) {
            utils.logWarning(
                `Event Validation Error: The event type ${
                    process.env[Events.Key]
                } is not supported because it's not tied to a branch or tag ref.`
            )
            return
        }

        let primaryKey = core.getState(State.CachePrimaryKey)

        if (!primaryKey) {
            utils.logWarning(`Error retrieving key from state.`)
            return
        }

        const checkOnly = core.getInput(Inputs.CheckOnly) && core.getBooleanInput(Inputs.CheckOnly)
        const skipSave = core.getInput(Inputs.SkipSave) && core.getBooleanInput(Inputs.SkipSave)
        if (!skipSave) {
            const state = utils.getCacheState()
            const toHash = core.getInput(Inputs.ToHash)
            let fastKey = `${primaryKey}-flk`
            if (toHash) {
                const hash = await hashFiles(toHash)
                if (hash) {
                    primaryKey = `${primaryKey}-${hash}`
                    fastKey = `${fastKey}-${hash}`
                }
            }

            if (utils.isExactKeyMatch(primaryKey, state)) {
                core.info(
                    `Cache hit occurred on the primary key ${primaryKey}, not saving cache.`
                )
                return
            }
            else if (checkOnly && utils.isExactKeyMatch(fastKey, state)) {
                core.info(
                    `Cache hit occurred on the fast key ${fastKey}, not saving cache.`
                )
                return
            }

            const cachePaths = utils.getInputAsArray(Inputs.Path, {
                required: true
            })
            const cacheId = await cache.saveCache(cachePaths, primaryKey, {
                uploadChunkSize: utils.getInputAsInt(Inputs.UploadChunkSize)
            })
            if (cacheId != -1) {
                core.info(`Cache saved with key: ${primaryKey}`)
            }
            const fs = require('fs')
            fs.closeSync(fs.openSync(fastKey, 'w'))
            const cacheIdFast = await cache.saveCache([fastKey], fastKey, {
                uploadChunkSize: utils.getInputAsInt(Inputs.UploadChunkSize)
            })
            if (cacheIdFast != -1) {
                core.info(`Cache saved with key: ${fastKey}`)
            }

        }
    } catch (error: unknown) {
        utils.logWarning((error as Error).message)
    }
}

run()

export default run
