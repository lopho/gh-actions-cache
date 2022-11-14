import * as cache from "@actions/cache";
import * as core from "@actions/core";

import { Events, Inputs, State } from "./constants";
import * as utils from "./utils/actionUtils";

async function run(): Promise<void> {
    try {
        if (!utils.isCacheFeatureAvailable()) {
            utils.setCacheHitOutput(false);
            return;
        }

        // Validate inputs, this can cause task failure
        if (!utils.isValidEvent()) {
            utils.logWarning(
                `Event Validation Error: The event type ${
                    process.env[Events.Key]
                } is not supported because it's not tied to a branch or tag ref.`
            );
            return;
        }

        let primaryKey = core.getInput(Inputs.Key, { required: true });
        const restoreKeys = utils.getInputAsArray(Inputs.RestoreKeys);

        // https://github.com/actions/toolkit/issues/844
        let alwaysSave = false;
        if (core.getInput(Inputs.AlwaysSave)) {
            alwaysSave = core.getBooleanInput(Inputs.AlwaysSave);
        }
        if (alwaysSave) {
            restoreKeys.push(`${primaryKey}-`);
            primaryKey = `${primaryKey}-${process.env['GITHUB_RUN_ID'] ?? Date.now()}`;
        }

        core.saveState(State.CachePrimaryKey, primaryKey);
        const cachePaths = utils.getInputAsArray(Inputs.Path, {
            required: true
        });

        const cacheKey = await cache.restoreCache(
            cachePaths,
            primaryKey,
            restoreKeys
        );

        if (!cacheKey) {
            core.info(
                `Cache not found for input keys: ${[
                    primaryKey,
                    ...restoreKeys
                ].join(", ")}`
            );

            return;
        }

        // Store the matched cache key
        utils.setCacheState(cacheKey);

        const isExactKeyMatch = utils.isExactKeyMatch(primaryKey, cacheKey);
        utils.setCacheHitOutput(isExactKeyMatch);
        core.info(`Cache restored from key: ${cacheKey}`);
    } catch (error: unknown) {
        core.setFailed((error as Error).message);
    }
}

run();

export default run;
