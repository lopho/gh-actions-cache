import * as cache from "@actions/cache"
import * as core from "@actions/core"
import { hashFiles } from "@actions/glob"

import { Events, Inputs, State } from "./constants"
import * as utils from "./utils/actionUtils"

async function run(): Promise<void> {
    try {
        if (!utils.isCacheFeatureAvailable()) {
            utils.setCacheHitOutput(false)
            return
        }

        // Validate inputs, this can cause task failure
        if (!utils.isValidEvent()) {
            utils.logWarning(
                `Event Validation Error: The event type ${
                    process.env[Events.Key]
                } is not supported because it's not tied to a branch or tag ref.`
            )
            return
        }

        const checkOnly = core.getInput(Inputs.CheckOnly) && core.getBooleanInput(Inputs.CheckOnly)
        const skipRestore = core.getInput(Inputs.SkipRestore) && core.getBooleanInput(Inputs.SkipRestore)
        const primaryKey = core.getInput(Inputs.Key, { required: true })
        core.saveState(State.CachePrimaryKey, primaryKey)
        if (!checkOnly && !skipRestore) {
            const restoreKeys = utils.getInputAsArray(Inputs.RestoreKeys)
            restoreKeys.push(`${primaryKey}-`)
            const cachePaths = utils.getInputAsArray(Inputs.Path, { required: true })
            const cacheKey = await cache.restoreCache(
                cachePaths,
                primaryKey,
                restoreKeys
            )
            if (!cacheKey) {
                core.info(
                    `Cache not found for input keys: ${[
                        primaryKey,
                        ...restoreKeys
                    ].join(", ")}`
                )
                return
            }
            core.info(`Cache restored from key: ${cacheKey}`)
        }

        const fastRestoreKeys = utils.getInputAsArray(Inputs.RestoreKeys)
        let fastKey = `${primaryKey}-flk`
        fastRestoreKeys.push(`${fastKey}-`)
        const toHash = core.getInput(Inputs.ToHash)
        if (toHash) {
            const hash = await hashFiles(toHash)
            fastKey = `${fastKey}-${hash}`
        }
        const fastCacheKey = await cache.restoreCache(
            [`${fastKey}`],
            fastKey,
            fastRestoreKeys
        )

        core.info(`primary key: ${primaryKey}`)
        core.info(`fast key: ${fastKey}`)

        if (!fastCacheKey) {
            core.info(
                `Cache not found for input keys: ${[
                    fastKey,
                    ...fastRestoreKeys
                ].join(", ")}`
            )
            return
        }
        // Store the matched cache key
        core.saveState(State.CacheMatchedKey, fastCacheKey)
        core.info(`Cache restored from key: ${fastCacheKey}`)
        const isExactKeyMatchFast = utils.isExactKeyMatch(fastKey, fastCacheKey)
        core.info(`Cache was hit: ${isExactKeyMatchFast}`)
        utils.setCacheHitOutput(isExactKeyMatchFast)

    } catch (error: unknown) {
        core.setFailed((error as Error).message)
    }
}

run()

export default run
