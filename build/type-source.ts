import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Where the type definitions are copied from. Local to each checkout, so it is not committed. */
type TypeSource = {
    pf2eRepoPath: string;
    pf2eBranch: string;
};

export function readTypeSource(): TypeSource {
    const configPath = path.resolve(packageRoot, "type-source.json");

    if (!fs.existsSync(configPath)) {
        console.error(
            `No type-source.json found at ${configPath}.\nCopy type-source.example.json to type-source.json and point it at your pf2e clone.`,
        );
        process.exit(1);
    }

    let config: Partial<TypeSource>;
    try {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as Partial<TypeSource>;
    } catch (error) {
        // Windows paths need doubled backslashes in JSON, which is easy to get wrong by hand.
        console.error(
            `${configPath} is not valid JSON: ${(error as Error).message}\nBackslashes in Windows paths must be doubled, as in "C:\\\\src\\\\foundry-modules\\\\pf2e".`,
        );
        process.exit(1);
    }

    const missing = (["pf2eRepoPath", "pf2eBranch"] as const).filter((key) => !config[key]);

    if (missing.length > 0) {
        console.error(`type-source.json is missing: ${missing.join(", ")}. See type-source.example.json.`);
        process.exit(1);
    }

    return config as TypeSource;
}
