import fs from "fs";
import { stringify } from "yaml";

export const generateSCConfigFile = (path: string, spec: any) => {
    const data = stringify(spec);
    fs.writeFileSync(path, data);
};

export const createOpenApiSpec = (spec: any, name: string, port: number) => {
    return {
        apiVersion: "core.space-cloud.io/v1alpha1",
        kind: "OpenAPISource",
        metadata: {
            name: name
        },
        spec: {
            source: { url: `http://localhost:${port}` },
            openapi: { value: spec }
        }
    };
};
